"""Internal user-behavior event ingestion endpoint.

``POST /api/events`` accepts one meaningful interaction at a time:

    {"event_type": "product_viewed", "product_id": 1}

Privacy-conscious by design:

* authenticated callers may be associated via their JWT (optional);
* anonymous browsing uses a random, non-identifying session identifier -
  either the existing ``sv_sid`` cookie, a client-generated uuid-style id,
  or a fresh server-side random id. Never an IP address or fingerprint;
* ``event_type`` must be in the controlled vocabulary; product/merchant IDs
  are validated against the database so arbitrary IDs are rejected (422);
* metadata passes the sanitizer - sensitive keys, images/blobs and oversized
  payloads can never be stored.
"""
from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.routes.auth import get_current_user_optional
from app.services.event_service import (
    EVENT_TYPES,
    is_valid_session_id,
    record_user_event,
)

router = APIRouter(prefix='/api', tags=['events'])

#: Same anonymous session cookie used by the merchant redirect tracker.
SESSION_COOKIE = 'sv_sid'

MAX_SESSION_ID_LENGTH = 64


class EventCreate(BaseModel):
    """Payload for a single behavior event."""

    event_type: str = Field(..., description=f"One of: {', '.join(EVENT_TYPES)}")
    product_id: int | None = None
    merchant_id: int | None = None
    #: Optional client-generated non-identifying session identifier.
    session_id: str | None = Field(None, max_length=MAX_SESSION_ID_LENGTH)
    #: Small non-sensitive context; sanitized server-side before storing.
    metadata: dict[str, Any] | None = None


@router.post(
    '/events',
    status_code=status.HTTP_201_CREATED,
    summary='Record one user behavior event (privacy-conscious)',
)
def create_event(
    payload: EventCreate,
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(get_current_user_optional),
) -> dict:
    if payload.event_type not in EVENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Unknown event_type {payload.event_type!r}. "
                f"Supported types: {', '.join(EVENT_TYPES)}."
            ),
        )

    # Prefer the existing redirect-tracker cookie; fall back to a validated
    # client-provided opaque id, then to a fresh random server-side id.
    session_id = request.cookies.get(SESSION_COOKIE)
    if not is_valid_session_id(session_id):
        session_id = (
            payload.session_id
            if is_valid_session_id(payload.session_id)
            else uuid.uuid4().hex
        )

    try:
        event = record_user_event(
            db,
            event_type=payload.event_type,
            user_id=(user.id if user else None),
            session_id=session_id,
            product_id=payload.product_id,
            merchant_id=payload.merchant_id,
            event_metadata=payload.metadata,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )

    return {
        'id': event.id,
        'event_type': event.event_type,
        'created_at': event.created_at,
    }
