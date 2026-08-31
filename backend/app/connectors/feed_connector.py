"""Real merchant feed connector (CSV / JSON product feeds).

Implements the same ``ProductConnector`` interface as the mock connector, so
the existing ingestion pipeline (validation -> normalization ->
deduplication -> Product/ProductOffer upsert) works unchanged. No website
scraping and no browser automation - only structured feeds.

Safety properties:

* **SSRF-safe fetching** - only http(s) URLs; the target host is DNS-resolved
  and loopback / private / link-local / reserved addresses are rejected
  (development override: ``FEED_ALLOW_PRIVATE_HOSTS=1``).
* **Bounded work** - hard request timeout (``FEED_TIMEOUT_SECONDS``) and a
  maximum feed size (``FEED_MAX_BYTES``); oversized or malformed feeds raise
  ``ConnectorError`` instead of destabilizing the app.
* **No arbitrary filesystem access** - local paths and file:// URLs are never
  fetched; nothing from the feed is written to disk.
* **Secrets stay out of the database and logs** - optional feed auth uses the
  NAME of an environment variable; only that name is stored.
* **Quarantined records** - rows failing validation never enter the catalog;
  they are reported back with per-field reasons so admins can fix the feed.

Expected record fields::

    external_product_id*  name*   brand   category      description
    price*                currency*       image_url     product_url*
    availability          rating          colors        sizes

(* required). Optional fields fall back to sane defaults via normalization.
"""
from __future__ import annotations

import csv
import io
import ipaddress
import json
import os
import socket
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

from app.connectors.base import ConnectorError, ProductConnector
from app.schemas.external_product import ExternalProduct

DEFAULT_FEED_TIMEOUT_SECONDS = 15
DEFAULT_FEED_MAX_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_SCHEMES = {'http', 'https'}
REQUIRED_FIELDS = ('external_product_id', 'name', 'price', 'currency', 'product_url')
#: Header aliases accepted in CSV/JSON records (canonical <- spellings).
FIELD_ALIASES = {
    'id': 'external_product_id',
    'product_id': 'external_product_id',
    'sku': 'external_product_id',
    'title': 'name',
    'product_name': 'name',
    'url': 'product_url',
    'link': 'product_url',
    'image': 'image_url',
    'image_link': 'image_url',
    'stock': 'availability',
}


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


def get_feed_timeout() -> int:
    return max(1, _env_int('FEED_TIMEOUT_SECONDS', DEFAULT_FEED_TIMEOUT_SECONDS))


def get_feed_max_bytes() -> int:
    return max(1024, _env_int('FEED_MAX_BYTES', DEFAULT_FEED_MAX_BYTES))


def allow_private_feed_hosts() -> bool:
    """Development-only escape hatch for localhost feed sources."""
    return os.getenv('FEED_ALLOW_PRIVATE_HOSTS', '').strip().lower() in {'1', 'true', 'yes'}


class FeedValidationError(ConnectorError):
    """Raised when a feed URL/content fails structural or security checks."""


def validate_feed_url(url: str) -> str:
    """Return the normalized URL or raise ``FeedValidationError``.

    Blocks non-http(s) schemes and any host resolving to a loopback /
    private / link-local / reserved address (SSRF protection).
    """
    cleaned = (url or '').strip()
    if not cleaned:
        raise FeedValidationError('Feed URL is empty.')
    if len(cleaned) > 2000:
        raise FeedValidationError('Feed URL is too long.')
    parsed = urlparse(cleaned)
    if parsed.scheme not in ALLOWED_SCHEMES:
        raise FeedValidationError(
            f"Feed URL scheme must be http/https (got '{parsed.scheme or 'none'}')."
        )
    host = parsed.hostname
    if not host:
        raise FeedValidationError('Feed URL has no host.')

    lowered = host.lower().rstrip('.')
    if allow_private_feed_hosts():
        return cleaned  # explicit development override for local feed servers

    if lowered in ('localhost', '0.0.0.0') or lowered.endswith('.local'):
        raise FeedValidationError('Feed URL must not point at localhost.')
    try:
        addr_infos = socket.getaddrinfo(host, None)
    except OSError as exc:
        raise FeedValidationError(f'Feed host could not be resolved: {host}') from exc
    for info in addr_infos:
        ip = ipaddress.ip_address(info[4][0])
        if (
            ip.is_loopback
            or ip.is_private
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            raise FeedValidationError(
                'Feed URL must not point at a private or local network address.'
            )
    return cleaned


@dataclass
class FetchReport:
    """Outcome of downloading + validating one merchant feed."""

    products: List[ExternalProduct] = field(default_factory=list)
    records_received: int = 0
    invalid_records: List[Dict[str, Any]] = field(default_factory=list)
    format_detected: Optional[str] = None
    content_bytes: int = 0

    @property
    def valid_count(self) -> int:
        return len(self.products)

    @property
    def invalid_count(self) -> int:
        return len(self.invalid_records)


class MerchantFeedConnector(ProductConnector):
    """Imports products from a remote CSV or JSON merchant feed."""

    merchant_slug = ''

    def __init__(
        self,
        merchant_slug: str,
        feed_url: str,
        feed_format: Optional[str] = None,
        auth_env_var: Optional[str] = None,
    ) -> None:
        self.merchant_slug = (merchant_slug or '').strip().lower()
        self.feed_format = (feed_format or '').strip().lower() or None
        self.auth_env_var = (auth_env_var or '').strip() or None
        # Validates scheme + SSRF rules immediately so misconfiguration is
        # caught before any network activity.
        self.feed_url = validate_feed_url(feed_url)

    def is_available(self) -> bool:
        """A feed is 'available' when its URL passes security validation."""
        return bool(self.feed_url)

    def _auth_headers(self) -> Dict[str, str]:
        """Resolve feed credentials from the configured environment variable.

        Only the *name* of the variable is stored on the merchant; the secret
        value is read at request time and never logged.
        """
        if not self.auth_env_var:
            return {}
        token = os.getenv(self.auth_env_var, '').strip()
        if not token:
            return {}
        return {'Authorization': f'Bearer {token}'}

    def fetch_content(
        self,
        opener: Optional[Any] = None,
        url_override: Optional[str] = None,
    ) -> Tuple[bytes, str]:
        """Download the feed within strict timeout/size bounds.

        Returns ``(content_bytes, content_type)``. ``opener``/``url_override``
        are injection points used by tests.
        """
        url = url_override or self.feed_url
        request = urllib.request.Request(url, headers={'User-Agent': 'StyleVerseFeedBot/1.0'})
        for key, value in self._auth_headers().items():
            request.add_header(key, value)
        urlopen = opener or urllib.request.urlopen
        try:
            with urlopen(request, timeout=get_feed_timeout()) as response:
                content_type = (response.headers.get('Content-Type') or '').split(';')[0].strip()
                chunks: List[bytes] = []
                received = 0
                while True:
                    chunk = response.read(64 * 1024)
                    if not chunk:
                        break
                    received += len(chunk)
                    if received > get_feed_max_bytes():
                        raise FeedValidationError(
                            f'Feed exceeds the maximum allowed size '
                            f'({get_feed_max_bytes()} bytes).'
                        )
                    chunks.append(chunk)
        except FeedValidationError:
            raise
        except urllib.error.HTTPError as exc:
            raise ConnectorError(f'Feed server returned HTTP {exc.code}.') from exc
        except urllib.error.URLError as exc:
            reason = getattr(exc, 'reason', None) or exc
            if isinstance(reason, (socket.timeout, TimeoutError)) or 'timed out' in str(reason).lower():
                raise ConnectorError(
                    f'Feed request timed out after {get_feed_timeout()} seconds.'
                ) from exc
            raise ConnectorError(f'Feed could not be reached: {reason}') from exc
        except (OSError, ValueError) as exc:
            raise ConnectorError(f'Feed could not be reached: {exc}') from exc

        content = b''.join(chunks)
        if not content.strip():
            raise FeedValidationError('Feed is empty.')
        return content, content_type

    def detect_format(self, content: bytes) -> str:
        """Return 'csv' or 'json', preferring explicit config then sniffing."""
        if self.feed_format in ('csv', 'json'):
            return self.feed_format
        text = content.lstrip()[:1]
        return 'json' if text in (b'{', b'[') else 'csv'

    @staticmethod
    def _canonical_field_name(name: Any) -> str:
        lowered = str(name).strip().lower().replace(' ', '_')
        return FIELD_ALIASES.get(lowered, lowered)

    def _canonicalize_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        result: Dict[str, Any] = {}
        for key, value in row.items():
            if key is None:
                continue
            result[self._canonical_field_name(key)] = value
        return result

    def parse_records(self, content: bytes, fmt: str) -> List[Dict[str, Any]]:
        """Decode feed content into raw dicts; malformed feeds raise."""
        try:
            text = content.decode('utf-8-sig')
        except UnicodeDecodeError:
            text = content.decode('latin-1', errors='replace')

        if fmt == 'json':
            try:
                payload = json.loads(text)
            except json.JSONDecodeError as exc:
                raise FeedValidationError(f'Feed is not valid JSON: {exc}') from exc
            if isinstance(payload, dict):
                payload = payload.get('products', payload.get('items'))
            if not isinstance(payload, list):
                raise FeedValidationError(
                    "JSON feed must be an array of products or contain a 'products' array."
                )
            rows = [row for row in payload if isinstance(row, dict)]
            if len(rows) != len(payload):
                raise FeedValidationError('JSON feed contains non-object records.')
            return [self._canonicalize_row(row) for row in rows]

        # CSV path.
        try:
            reader = csv.DictReader(io.StringIO(text))
            if not reader.fieldnames:
                raise FeedValidationError('CSV feed has no header row.')
            canonical_fields = {
                self._canonical_field_name(name) for name in reader.fieldnames
            }
            missing = [f for f in REQUIRED_FIELDS if f not in canonical_fields]
            if missing:
                raise FeedValidationError(
                    f'CSV feed is missing required column(s): {", ".join(missing)}.'
                )
            rows: List[Dict[str, Any]] = []
            for row in reader:
                cleaned = {
                    (key or ''): value
                    for key, value in row.items()
                    if key is not None
                }
                rows.append(self._canonicalize_row(cleaned))
            return rows
        except csv.Error as exc:
            raise FeedValidationError(f'CSV feed is malformed: {exc}') from exc

    def _validate_record(
        self,
        row: Dict[str, Any],
        row_index: int,
    ) -> Tuple[Optional[ExternalProduct], Dict[str, Any]]:
        """Validate one raw row -> (ExternalProduct | None, report entry)."""
        errors: List[str] = []

        external_id = str(row.get('external_product_id') or '').strip()
        if not external_id:
            errors.append('external_product_id is required.')

        name = str(row.get('name') or '').strip()
        if not name:
            errors.append('name is required.')

        price_raw = row.get('price')
        price_text = str(price_raw).strip() if price_raw is not None else ''
        price_value: Optional[float] = None
        if not price_text:
            errors.append('price is required.')
        else:
            cleaned_price = price_text.replace(',', '').replace('₹', '').replace('$', '')
            try:
                price_value = float(cleaned_price)
            except (TypeError, ValueError):
                errors.append(f"price '{price_text}' is not a valid number.")
            else:
                if price_value < 0:
                    errors.append('price must not be negative.')
                    price_value = None

        currency = str(row.get('currency') or 'INR').strip() or 'INR'

        product_url = str(row.get('product_url') or '').strip()
        if not product_url:
            errors.append('product_url is required.')
        elif urlparse(product_url).scheme.lower() not in ALLOWED_SCHEMES:
            errors.append('product_url must be a valid http(s) URL.')

        image_url = str(row.get('image_url') or '').strip() or None
        if image_url and urlparse(image_url).scheme.lower() not in ALLOWED_SCHEMES:
            # Local/invalid image references are dropped (never fetched), but
            # the record itself is still usable - only the image is lost.
            image_url = None

        rating_raw = row.get('rating')
        try:
            rating_value = float(str(rating_raw)) if rating_raw not in (None, '') else 0.0
        except (TypeError, ValueError):
            rating_value = 0.0

        if errors:
            preview = {
                key: (str(value)[:120] if value is not None else None)
                for key, value in list(row.items())[:14]
            }
            return None, {
                'row_index': row_index,
                'errors': errors,
                'external_product_id': external_id or None,
                'name': name or None,
                'record': preview,
            }

        description_raw = row.get('description')
        product = ExternalProduct(
            merchant=self.merchant_slug,
            external_product_id=external_id,
            name=name,
            brand=str(row.get('brand') or '').strip(),
            category=str(row.get('category') or '').strip(),
            description=(str(description_raw).strip()[:500]
                         if description_raw not in (None, '') else None),
            price=price_value,
            currency=currency,
            image_url=image_url,
            product_url=product_url,
            availability=str(row.get('availability') or 'in_stock').strip() or 'in_stock',
            rating=max(0.0, min(5.0, rating_value)),
            colors=self._split_list(row.get('colors')),
            sizes=self._split_list(row.get('sizes')),
        )
        return product, {
            'row_index': row_index,
            'errors': [],
            'external_product_id': external_id,
            'name': name,
        }

    @staticmethod
    def _split_list(raw: Any) -> List[str]:
        """Split 'Red|Blue' / 'Red; Blue' / 'Red,Blue' into a clean list."""
        if raw in (None, ''):
            return []
        items = raw if isinstance(raw, list) else None
        if items is None:
            text = str(raw).strip()
            separator = '|' if '|' in text else (';' if ';' in text else ',')
            items = text.split(separator)
        return [str(item).strip() for item in items if str(item).strip()]

    def validate_content(self, content: bytes) -> FetchReport:
        """Parse + validate feed content without touching any database."""
        fmt = self.detect_format(content)
        report = FetchReport(format_detected=fmt, content_bytes=len(content))
        rows = self.parse_records(content, fmt)
        report.records_received = len(rows)
        for index, row in enumerate(rows):
            product, entry = self._validate_record(row, index)
            if product is None:
                report.invalid_records.append(entry)
            else:
                report.products.append(product)
        return report

    # ------------------------------------------------------------------
    # ProductConnector interface
    # ------------------------------------------------------------------
    def fetch_with_report(self) -> FetchReport:
        content, _content_type = self.fetch_content()
        return self.validate_content(content)

    def fetch_products(self) -> List[ExternalProduct]:
        """Valid records only; invalid ones are quarantined."""
        return self.fetch_with_report().products

    def fetch_product_details(self, external_product_id: str) -> Optional[ExternalProduct]:
        for product in self.fetch_products():
            if product.external_product_id == external_product_id:
                return product
        return None



