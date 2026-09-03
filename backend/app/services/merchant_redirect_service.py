"""Merchant outbound redirect + link abstraction (MerchantLinkService).

The frontend never fakes checkout inside StyleVerse: it sends users to the
merchant's own product page through one tracked backend endpoint. All
outbound traffic funnels through this module so that affiliate tracking /
click analytics live in exactly one place without touching routes or the UI.

Responsibilities:
  * **Destination resolution** - prefers the offer's real ``product_url``
    captured at ingestion time; falls back to an honest store *search* URL
    for legacy seeded offers that never had a deep link (never fabricated
    product pages).
  * **Open-redirect protection** - destinations ALWAYS come from the trusted
    ``ProductOffer`` record or built-in store search templates; only
    http/https schemes are allowed (javascript:, data:, file:, ... rejected)
    and the frontend can never supply an arbitrary target.
  * **Affiliate-ready transformation hook** - ``transform_for_affiliate`` is
    the single future seam for affiliate URLs; today it is an identity
    function with no affiliate IDs or credentials.
  * **Click recording** - ``record_merchant_click`` persists one privacy-
    conscious ``MerchantClick`` row per outbound click.

It never rewrites or proxies the merchant page - the visitor is redirected.
"""
from __future__ import annotations

from typing import Any, Optional
from urllib.parse import quote_plus, urlparse

from sqlalchemy.orm import Session

from app.models.merchant_click import MerchantClick

ALLOWED_REDIRECT_SCHEMES = ('http', 'https')


def is_safe_redirect_url(url: Any) -> bool:
    """True when ``url`` uses an allowed http(s) scheme and has a host."""
    if not url or not isinstance(url, str):
        return False
    try:
        parsed = urlparse(url.strip())
    except ValueError:
        return False
    return (
        parsed.scheme.lower() in ALLOWED_REDIRECT_SCHEMES
        and bool(parsed.hostname)
        and parsed.hostname.lower() != 'example.com'
        and not parsed.hostname.lower().endswith('.example.com')
    )

# Fallback deep links for legacy offers identified only by ``(product, store)``.
# These are search URLs on the merchant's own site - never fabricated PDPs.
STORE_SEARCH_URLS: dict[str, str] = {
    'amazon': 'https://www.amazon.in/s?k={query}',
    'myntra': 'https://www.myntra.com/{query}',
    'ajio': 'https://www.ajio.com/search/?text={query}',
    'flipkart': 'https://www.flipkart.com/search?q={query}',
}


def resolve_outbound_url(offer: Any, product_name: str | None = None) -> Optional[str]:
    """Return the best available external URL for a merchant offer."""
    product_url = getattr(offer, 'product_url', None)
    if product_url:
        return product_url if is_safe_redirect_url(product_url) else None

    store_slug = str(getattr(offer, 'store', '') or '').strip().lower()
    template = STORE_SEARCH_URLS.get(store_slug)
    if template and product_name:
        return template.format(query=quote_plus(product_name))
    if template:
        return template.format(query=store_slug)
    return None


def build_visit_path(product_id: int | None, offer_id: int | None) -> Optional[str]:
    """Frontend-facing tracked redirect path served by the redirect router."""
    if offer_id is None or product_id is None:
        return None
    return f'/api/redirect/{offer_id}'


class MerchantLinkService:
    """Single seam between an offer and its outbound destination.

    Today it resolves the normal merchant URL; tomorrow the same interface can
    transparently return an affiliate URL once affiliate networks/credentials
    exist (routes and the frontend will not change).
    """

    def build_redirect_target(
        self,
        offer: Any,
        product_name: str | None = None,
    ) -> Optional[str]:
        """Resolve + validate the destination for one offer, or None."""
        candidate = resolve_outbound_url(offer, product_name)
        if candidate and self.is_allowed_destination(candidate):
            return self.transform_for_affiliate(candidate, offer)
        return None

    def is_allowed_destination(self, url: str) -> bool:
        """Reject unsupported schemes / malformed targets (open-redirect guard)."""
        return is_safe_redirect_url(url)

    def transform_for_affiliate(self, target_url: str, offer: Any = None) -> str:
        """Future affiliate seam. Identity function until networks exist."""
        return target_url


merchant_link_service = MerchantLinkService()


def record_merchant_click(
    db: Session,
    *,
    offer: Any,
    product_id: int,
    user_id: int | None = None,
    session_id: str | None = None,
    referrer: str | None = None,
    user_agent: str | None = None,
) -> MerchantClick:
    """Persist one privacy-conscious click row and return it.

    Stores only what is needed to understand merchant/product clicks: which
    offer was clicked, when, a random non-identifying session identifier for
    anonymous visitors, and truncated referrer/user-agent snippets. No IPs,
    no fingerprints, no personal information.

    Legacy offers without a ``merchant_id`` get one resolved by matching their
    store name against the Merchant registry so per-merchant analytics still
    work for seeded rows.
    """
    from app.models.merchant import Merchant

    merchant_id = getattr(offer, 'merchant_id', None)
    if not merchant_id:
        store_name = (getattr(offer, 'store', '') or '').strip()
        if store_name:
            merchant = (
                db.query(Merchant).filter(Merchant.name == store_name).first()
                or db.query(Merchant).filter(Merchant.slug == store_name.lower()).first()
            )
            merchant_id = merchant.id if merchant else None

    click = MerchantClick(
        offer_id=offer.id,
        merchant_id=merchant_id,
        product_id=product_id,
        user_id=user_id,
        session_id=(session_id or None),
        referrer=(referrer[:500] if referrer else None),
        user_agent=(user_agent[:300] if user_agent else None),
    )
    db.add(click)
    db.commit()
    db.refresh(click)

    # Mirror the click into the behavior-event stream (single insertion point
    # shared by both redirect routes, so no duplicate events are possible).
    try:
        from app.services.event_service import record_user_event

        record_user_event(
            db,
            event_type='merchant_clicked',
            user_id=user_id,
            session_id=session_id,
            product_id=product_id,
            merchant_id=merchant_id,
        )
    except ValueError:
        # Never fail an outbound redirect because of analytics bookkeeping.
        db.rollback()

    return click
