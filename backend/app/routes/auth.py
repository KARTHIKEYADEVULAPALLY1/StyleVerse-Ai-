from __future__ import annotations

import jwt
from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    create_user,
    decode_access_token,
)

router = APIRouter(prefix='/api/auth', tags=['auth'])

# Extracts the Bearer token from the Authorization header
_bearer = HTTPBearer(auto_error=False)

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail='Could not validate credentials.',
    headers={'WWW-Authenticate': 'Bearer'},
)


# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------

def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Authentication token is missing.',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token has expired.',
            headers={'WWW-Authenticate': 'Bearer'},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid or malformed authentication token.',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    user_id_raw = payload.get('sub')
    if user_id_raw is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid token payload: subject claim missing.',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    try:
        user_id = int(user_id_raw)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid token payload: subject claim is invalid.',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Authenticated user no longer exists.',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    return user


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post('/signup', response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(user: UserCreate, db: Session = Depends(get_db)) -> TokenResponse:
    existing_user = db.query(User).filter(User.email == user.email.strip().lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='An account with this email already exists.',
        )

    db_user = create_user(db, user)
    access_token = create_access_token({'sub': str(db_user.id)})
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(db_user),
    )


@router.post('/login', response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)) -> TokenResponse:
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid email or password.',
        )

    access_token = create_access_token({'sub': str(user.id)})
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@router.get('/me', response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
