"""Tracked merchant redirect endpoint.

``GET /api/redirect/{offer_id}`` is the single outbound funnel for
"View on Merchant" clicks:

    offer lookup -> validity + open-redirect guard -> click recorded ->
    302 to the merchant's trusted product URL

Destinations come exclusively from the stored ``ProductOffer`` record (or the
built-in store search fallback) - the frontend can never inject a target.
Clicks are privacy-conscious: anonymous visitors get a random non-identifying
session cookie; authenticated users are optionally associated by user id.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product_offer import ProductOffer
from app.routes.auth import get_current_user_optional
from app.services.merchant_redirect_service import (
    build_visit_path,
    merchant_link_service,
    record_merchant_click,
)
from app.services.product_service import get_product_by_id

router = APIRouter(prefix='/api', tags=['merchant-redirect'])

SESSION_COOKIE = 'sv_sid'
SESSION_COOKIE_MAX_AGE = 180 * 24 * 3600  # 180 days


def _resolve_and_validate(db: Session, offer_id: int):
    """Shared offer lookup + destination validation for both redirect routes."""
    offer = db.query(ProductOffer).filter(ProductOffer.id == offer_id).first()
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Offer with ID {offer_id} not found.',
        )
    product = get_product_by_id(db, offer.product_id)
    target = merchant_link_service.build_redirect_target(
        offer, product.name if product else None
    )
    if not target:
        # Unsafe scheme/malformed stored URL or no destination at all - never
        # redirect and never record a click for an unusable offer.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='This offer has no valid merchant destination URL yet.',
        )
    return offer, target


@router.get(
    '/redirect/{offer_id}',
    summary='Record a merchant click and redirect to the merchant product page',
    response_class=RedirectResponse,
)
def redirect_to_merchant(
    offer_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(get_current_user_optional),
) -> RedirectResponse:
    """Track the click, then send the visitor to the merchant's own page."""
    offer, target = _resolve_and_validate(db, offer_id)

    session_id = request.cookies.get(SESSION_COOKIE) or uuid.uuid4().hex
    record_merchant_click(
        db,
        offer=offer,
        product_id=offer.product_id,
        user_id=(user.id if user else None),
        session_id=session_id,
        referrer=request.headers.get('referer'),
        user_agent=request.headers.get('user-agent'),
    )

    response = RedirectResponse(url=target, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        SESSION_COOKIE,
        session_id,
        max_age=SESSION_COOKIE_MAX_AGE,
        httponly=True,
        samesite='lax',
    )
    return response


@router.get(
    '/products/{product_id}/offers/{offer_id}/visit',
    summary='Legacy tracked redirect (kept for compatibility)',
    response_class=RedirectResponse,
    include_in_schema=False,
)
def legacy_visit_merchant_offer(
    product_id: int,
    offer_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(get_current_user_optional),
) -> RedirectResponse:
    """Old public path - now records clicks exactly like /api/redirect."""
    offer, target = _resolve_and_validate(db, offer_id)
    if offer.product_id != product_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Offer with ID {offer_id} not found for product {product_id}.',
        )

    session_id = request.cookies.get(SESSION_COOKIE) or uuid.uuid4().hex
    record_merchant_click(
        db,
        offer=offer,
        product_id=offer.product_id,
        user_id=(user.id if user else None),
        session_id=session_id,
        referrer=request.headers.get('referer'),
        user_agent=request.headers.get('user-agent'),
    )
    response = RedirectResponse(url=target, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        SESSION_COOKIE,
        session_id,
        max_age=SESSION_COOKIE_MAX_AGE,
        httponly=True,
        samesite='lax',
    )
    return response


# Re-exported so other modules can keep importing the path builder from here.
__all__ = ['router', 'build_visit_path']
