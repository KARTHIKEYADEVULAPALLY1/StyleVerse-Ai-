"""First real merchant connector: Etsy Open API v3.

Uses ONLY the officially supported, documented Etsy application API
(https://developers.etsy.com/documentation/) - no scraping and no private
endpoints::

    GET {base}/application/listings/active
    Headers: x-api-key: <ETSY_API_KEY>
    Params:  keywords, limit (<=100), offset, includes=Images:1

Documented behaviour implemented here:

* ``x-api-key`` authentication (key lives ONLY in ETSY_API_KEY env var);
* ``offset``/``limit`` pagination until ``count`` is consumed;
* published rate limits honoured - HTTP 429 sleeps for the server-provided
  ``Retry-After`` seconds (bounded);
* hard request timeout (``ETSY_TIMEOUT_SECONDS``) plus bounded exponential
  backoff retries for transient 5xx/timeouts;
* 401/403 surface a readable credentials message (the key itself is never
  logged); other HTTP errors map to clear ConnectorError messages;
* every listing passes the same field validation rules as merchant feeds
  (required id/title/price/currency/url, positive price, http(s) URLs);
* invalid listings are quarantined into the FetchReport instead of imported;
* external product IDs (Etsy listing ids) and merchant product URLs are
  preserved so re-syncs UPDATE existing offers instead of duplicating.

Configuration (backend/.env.example)::

    ETSY_ENABLED=false            # master switch - off unless explicitly enabled
    ETSY_API_KEY=                 # personal access string from developer app
    ETSY_BASE_URL=https://openapi.etsy.com/v3
    ETSY_KEYWORDS=dress           # default search keywords
    ETSY_PAGE_SIZE=25             # 1..100
    ETSY_MAX_PAGES=3              # safety cap per sync
    ETSY_TIMEOUT_SECONDS=15
"""
from __future__ import annotations

import json
import os
import socket
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

from app.connectors.base import ConnectorError, ProductConnector
from app.connectors.feed_connector import FetchReport
from app.schemas.external_product import ExternalProduct

DEFAULT_ETSY_BASE_URL = 'https://openapi.etsy.com/v3'
LISTINGS_ACTIVE_PATH = '/application/listings/active'
MAX_ATTEMPTS = 3


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {'1', 'true', 'yes', 'on'}


def get_etsy_timeout() -> int:
    return max(1, _env_int('ETSY_TIMEOUT_SECONDS', 15))


def get_page_size() -> int:
    return min(100, max(1, _env_int('ETSY_PAGE_SIZE', 25)))


def get_max_pages() -> int:
    return min(20, max(1, _env_int('ETSY_MAX_PAGES', 3)))


def etsy_enabled_by_env() -> bool:
    return _env_bool('ETSY_ENABLED', False)


class EtsyConnector(ProductConnector):
    """Imports active listings from the official Etsy Open API v3."""

    merchant_slug = 'etsy'

    def __init__(
        self,
        merchant_slug: str = 'etsy',
        api_key: Optional[str] = None,
        keywords: Optional[str] = None,
        base_url: Optional[str] = None,
        enabled: Optional[bool] = None,
    ) -> None:
        self.merchant_slug = (merchant_slug or 'etsy').strip().lower()
        self.api_key = (api_key if api_key is not None else os.getenv('ETSY_API_KEY', '')).strip()
        self.keywords = (
            keywords if keywords is not None else os.getenv('ETSY_KEYWORDS', '')
        ).strip()
        self.base_url = (
            base_url if base_url is not None else os.getenv('ETSY_BASE_URL', DEFAULT_ETSY_BASE_URL)
        ).rstrip('/')
        self.enabled = etsy_enabled_by_env() if enabled is None else bool(enabled)

    def is_configured(self) -> bool:
        """True when an API key is present (via env or explicit argument)."""
        return bool(self.api_key)

    def is_available(self) -> bool:
        """Connected = key present AND the connector is enabled."""
        return self.is_configured() and self.enabled

    def _headers(self) -> Dict[str, str]:
        return {
            'x-api-key': self.api_key,
            'Accept': 'application/json',
            'User-Agent': 'StyleVerseMerchantSync/1.0',
        }

    def _request(
        self,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        opener: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """One authenticated GET with bounded retries. Returns parsed JSON."""
        clean_params = {k: v for k, v in (params or {}).items() if v not in (None, '')}
        query = urllib.parse.urlencode(clean_params)
        url = f'{self.base_url}{path}' + (f'?{query}' if query else '')
        request = urllib.request.Request(url, headers=self._headers())
        urlopen = opener or urllib.request.urlopen

        last_error: Optional[ConnectorError] = None
        for attempt in range(MAX_ATTEMPTS):
            try:
                with urlopen(request, timeout=get_etsy_timeout()) as response:
                    body = response.read()
                try:
                    payload = json.loads(body.decode('utf-8'))
                except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                    raise ConnectorError(
                        f'Etsy API returned an invalid response (not valid JSON): {exc}'
                    ) from exc
                if not isinstance(payload, dict):
                    raise ConnectorError(
                        'Etsy API returned an unexpected response shape '
                        '(expected a JSON object).'
                    )
                return payload
            except ConnectorError:
                raise  # response-shape problems are not transient
            except urllib.error.HTTPError as exc:
                if exc.code in (401, 403):
                    # Credentials problem: never retried, never logs the key.
                    raise ConnectorError(
                        f'Etsy API authentication failed (HTTP {exc.code}). '
                        'Check that ETSY_API_KEY is a valid, enabled key.'
                    ) from exc
                if exc.code == 404:
                    raise ConnectorError(
                        f'Etsy API endpoint not found (HTTP 404): {path}. '
                        'Check ETSY_BASE_URL.'
                    ) from exc
                if exc.code == 429:
                    retry_after = 1.0
                    try:
                        retry_after = min(30.0, max(0.0, float(exc.headers.get('Retry-After'))))
                    except (TypeError, ValueError):
                        pass
                    last_error = ConnectorError(
                        'Etsy API rate limit reached (HTTP 429). Try again shortly.'
                    )
                    if attempt < MAX_ATTEMPTS - 1:
                        time.sleep(retry_after)
                        continue
                    break
                elif 500 <= exc.code < 600:
                    last_error = ConnectorError(f'Etsy API server error (HTTP {exc.code}).')
                    if attempt < MAX_ATTEMPTS - 1:
                        time.sleep(2 ** attempt)
                        continue
                    break
                else:
                    raise ConnectorError(
                        f'Etsy API request failed (HTTP {exc.code}).'
                    ) from exc
            except urllib.error.URLError as exc:
                reason = getattr(exc, 'reason', None) or exc
                timed_out = isinstance(reason, (socket.timeout, TimeoutError)) or (
                    'timed out' in str(reason).lower()
                )
                if timed_out:
                    last_error = ConnectorError(
                        f'Etsy API request timed out after {get_etsy_timeout()} seconds.'
                    )
                else:
                    last_error = ConnectorError(f'Etsy API could not be reached: {reason}')
                if attempt < MAX_ATTEMPTS - 1:
                    time.sleep(2 ** attempt)
                    continue
                break
            except (OSError, ValueError) as exc:
                last_error = ConnectorError(f'Etsy API could not be reached: {exc}')
                if attempt < MAX_ATTEMPTS - 1:
                    time.sleep(2 ** attempt)
                    continue
                break

        raise last_error or ConnectorError('Etsy API request failed.')

    # ------------------------------------------------------------------
    # Pagination + listing validation
    # ------------------------------------------------------------------
    def fetch_page(
        self,
        offset: int,
        limit: int,
        opener: Optional[Any] = None,
    ) -> Dict[str, Any]:
        params = {
            'keywords': self.keywords or None,
            'limit': limit,
            'offset': offset,
            'includes': 'Images:1',
        }
        return self._request(LISTINGS_ACTIVE_PATH, params, opener=opener)

    def fetch_with_report(self, opener: Optional[Any] = None) -> FetchReport:
        """Fetch all pages within the safety cap and validate every listing."""
        if not self.is_configured():
            raise ConnectorError(
                'Etsy connector is not configured: set ETSY_API_KEY in the '
                'backend environment first.'
            )
        if not self.enabled:
            raise ConnectorError(
                'Etsy connector is disabled (ETSY_ENABLED=false). Enable it '
                'in the backend environment before syncing.'
            )

        report = FetchReport(format_detected='json')
        limit = get_page_size()
        max_pages = get_max_pages()
        offset = 0
        total: Optional[int] = None

        for _page in range(max_pages):
            payload = self.fetch_page(offset, limit, opener=opener)
            results = payload.get('results')
            if not isinstance(results, list):
                raise ConnectorError(
                    "Etsy API response is missing its 'results' array."
                )
            count = payload.get('count')
            if isinstance(count, int):
                total = count

            for index, row in enumerate(results):
                product, entry = self.validate_listing(row, offset + index)
                report.records_received += 1
                if product is None:
                    report.invalid_records.append(entry)
                else:
                    report.products.append(product)

            offset += len(results)
            if not results or len(results) < limit:
                break
            if total is not None and offset >= total:
                break

        return report

    @staticmethod
    def _first_image_url(row: Dict[str, Any]) -> Optional[str]:
        images = row.get('images')
        if not isinstance(images, list) or not images:
            return None
        first = images[0] if isinstance(images[0], dict) else {}
        for key in ('url_570xN', 'url_fullxfull', 'url_170x135'):
            candidate = str(first.get(key) or '').strip()
            if candidate:
                return candidate
        return None

    def validate_listing(
        self,
        row: Any,
        row_index: int,
    ) -> Tuple[Optional[ExternalProduct], Dict[str, Any]]:
        """Validate one Etsy listing -> (ExternalProduct | None, report entry)."""
        errors: List[str] = []
        row_dict = row if isinstance(row, dict) else {}

        listing_id = str(row_dict.get('listing_id') or '').strip()
        if not listing_id:
            errors.append('listing_id is required.')

        title = str(row_dict.get('title') or '').strip()
        if not title:
            errors.append('title is required.')

        price_raw = row_dict.get('price')
        price_value: Optional[float] = None
        if price_raw in (None, ''):
            errors.append('price is required.')
        else:
            try:
                divider = float(row_dict.get('divider') or 100)
                price_value = float(price_raw) / (divider if divider > 0 else 100)
                if price_value <= 0:
                    errors.append(f"price '{price_raw}' must be positive.")
                    price_value = None
            except (TypeError, ValueError):
                errors.append(f"price '{price_raw}' is not a valid amount.")
                price_value = None

        currency = str(row_dict.get('currency_code') or '').strip().upper()
        if not currency:
            errors.append('currency_code is required.')

        product_url = str(row_dict.get('url') or '').strip()
        if not product_url:
            errors.append('url is required.')
        elif urlparse(product_url).scheme.lower() != 'https':
            errors.append('url must be a valid https URL.')

        image_url = self._first_image_url(row_dict)
        if image_url and urlparse(image_url).scheme.lower() not in ('http', 'https'):
            image_url = None  # drop invalid image refs, keep the record usable

        state = str(row_dict.get('state') or 'active').strip().lower()
        quantity_raw = row_dict.get('quantity')
        available = state == 'active'
        if available and quantity_raw not in (None, ''):
            try:
                available = float(quantity_raw) > 0
            except (TypeError, ValueError):
                pass

        taxonomy_path = row_dict.get('taxonomy_path')
        category = ''
        if isinstance(taxonomy_path, list) and taxonomy_path:
            category = str(taxonomy_path[0] or '').strip()
        if not category:
            category = str(row_dict.get('taxonomy_title') or '').strip()

        if errors:
            preview = {
                'listing_id': listing_id or None,
                'title': title[:120] or None,
                'price': price_raw,
                'currency_code': currency or None,
                'state': state,
            }
            return None, {
                'row_index': row_index,
                'errors': errors,
                'external_product_id': listing_id or None,
                'name': title[:120] or None,
                'record': preview,
            }

        description_raw = row_dict.get('description')
        product = ExternalProduct(
            merchant=self.merchant_slug,
            external_product_id=listing_id,
            name=title,
            brand=str(row_dict.get('shop_title') or '').strip(),
            category=category,
            description=(str(description_raw).strip()[:500]
                         if description_raw else None),
            price=price_value,
            currency=currency,
            image_url=image_url,
            product_url=product_url,
            availability='In Stock' if available else 'Out of Stock',
            rating=0.0,
            colors=[],
            sizes=[],
        )
        return product, {
            'row_index': row_index,
            'errors': [],
            'external_product_id': listing_id,
            'name': title[:120],
        }

    # ------------------------------------------------------------------
    # ProductConnector interface
    # ------------------------------------------------------------------
    def fetch_products(self) -> List[ExternalProduct]:
        """Valid listings only; invalid ones are quarantined."""
        return self.fetch_with_report().products

    def fetch_product_details(self, external_product_id: str) -> Optional[ExternalProduct]:
        for product in self.fetch_products():
            if product.external_product_id == external_product_id:
                return product
        return None

