from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import bcrypt
import jwt
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate

# Load .env explicitly from backend root
BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / '.env')

JWT_SECRET_KEY: str = os.getenv('JWT_SECRET_KEY', 'styleverse_super_secret_jwt_key_change_me_in_production_2026')
JWT_ALGORITHM: str = os.getenv('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '1440'))


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False


# ---------------------------------------------------------------------------
# User helpers
# ---------------------------------------------------------------------------

def create_user(db: Session, user_data: UserCreate) -> User:
    hashed_password = hash_password(user_data.password)
    db_user = User(
        name=user_data.name.strip(),
        email=user_data.email.strip().lower(),
        hashed_password=hashed_password,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email.strip().lower()).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Generate a signed JWT token containing claims and expiration."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta if expires_delta is not None else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({
        'exp': expire,
        'iat': now,
    })
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT token against algorithm and signature.

    Raises jwt.ExpiredSignatureError on expired tokens or jwt.PyJWTError on invalid tokens.
    """
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])

