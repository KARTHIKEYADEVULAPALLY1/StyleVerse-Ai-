"""Storage boundary for user and generated media.

Only the local implementation is enabled by default.  Cloud providers can
implement the same small contract without changing API routes or processors.
"""
from __future__ import annotations

import os
import re
import uuid
from abc import ABC, abstractmethod
from pathlib import Path
from dotenv import load_dotenv


SAFE_KEY = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._/-]*$")
BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / '.env')


class MediaStorage(ABC):
    @abstractmethod
    def save(self, key: str, data: bytes) -> str: ...

    @abstractmethod
    def delete(self, key: str) -> None: ...

    @abstractmethod
    def get_public_url(self, key: str) -> str: ...

    @abstractmethod
    def exists(self, key: str) -> bool: ...

    @abstractmethod
    def get_path(self, key: str) -> Path: ...


class LocalMediaStorage(MediaStorage):
    """Local development storage with containment checks on every operation."""
    def __init__(self, root: Path | None = None, base_url: str | None = None) -> None:
        self.root = (root or Path(os.getenv("MEDIA_LOCAL_ROOT", BACKEND_DIR / "uploads"))).resolve()
        self.base_url = (base_url or os.getenv("MEDIA_BASE_URL", "/media")).rstrip("/")
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        if key.startswith(("/", "\\")):
            raise ValueError("Invalid media key")
        key = key.replace("\\", "/").lstrip("/")
        if not SAFE_KEY.fullmatch(key) or ".." in Path(key).parts:
            raise ValueError("Invalid media key")
        path = (self.root / key).resolve()
        if self.root != path and self.root not in path.parents:
            raise ValueError("Invalid media key")
        return path

    def save(self, key: str, data: bytes) -> str:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return key

    def delete(self, key: str) -> None:
        path = self._path(key)
        if path.is_file():
            path.unlink()

    def get_public_url(self, key: str) -> str:
        self._path(key)
        normalized_key = key.replace("\\", "/").lstrip("/")
        return f"{self.base_url}/{normalized_key}"

    def exists(self, key: str) -> bool:
        return self._path(key).is_file()

    def get_path(self, key: str) -> Path:
        return self._path(key)


def safe_filename(extension: str) -> str:
    extension = extension.lower().lstrip(".")
    if extension not in {"jpg", "jpeg", "png", "webp"}:
        raise ValueError("Unsupported media extension")
    return f"{uuid.uuid4().hex}.{extension}"


# --- Image URL validation ---------------------------------------------------
# We validate *format* only - no network calls. This keeps ingestion fast and
# prevents the catalog from accidentally committing obviously dangerous URLs
# (``javascript:``, ``data:text/html``, ``file://``) or garbage strings that
# would render as broken images.

_MAX_IMAGE_URL_LENGTH = 2048

# Schemes that are never acceptable on a catalog image field. ``javascript:``,
# ``data:text/html`` and ``vbscript:`` are XSS vectors, ``file://`` is a path
# traversal / local-disclosure risk, and FTP is dead weight for a web catalog.
_BLOCKED_SCHEMES = frozenset(
    {"javascript", "data", "file", "vbscript", "ftp", "ftps"}
)


def validate_image_url(value: str | None) -> bool:
    """Return True if *value* is a safe image URL or relative path.

    Accepts:
      - ``http://`` and ``https://`` absolute URLs with a host component
      - Root-relative paths starting with ``/``

    Rejects:
      - Anything over :data:`_MAX_IMAGE_URL_LENGTH` characters
      - Empty / whitespace-only / non-string inputs
      - ``javascript:``, ``data:``, ``file://``, ``vbscript:``, ``ftp:`` etc.
      - URLs missing a host or path component
    """
    if not value or not isinstance(value, str):
        return False
    candidate = value.strip()
    if not candidate or len(candidate) > _MAX_IMAGE_URL_LENGTH:
        return False

    # Root-relative paths are always valid (they point at our own /media/*).
    if candidate.startswith("/"):
        # Reject obviously bad-looking relatives like "///etc/passwd" by
        # requiring at least one path segment after the leading slash.
        return len(candidate) > 1 and not candidate.startswith("//")

    # Anything else must be parseable as a URL with an http(s) scheme.
    lowered = candidate.lower()
    for scheme in _BLOCKED_SCHEMES:
        if lowered.startswith(scheme + ":") or lowered.startswith(scheme + "%3a"):
            return False

    if not (candidate.lower().startswith("http://") or candidate.lower().startswith("https://")):
        return False

    # We deliberately avoid ``urllib.parse`` here so the function stays cheap
    # and doesn't import a large surface area into ingestion.  Manual checks
    # are sufficient for the format-only contract we advertise.
    scheme_sep = candidate.find("://")
    if scheme_sep < 0:
        return False
    after_scheme = candidate[scheme_sep + 3 :]
    # Require a non-empty host followed by a path (querystring allowed).
    if not after_scheme or "/" not in after_scheme:
        return False
    host = after_scheme.split("/", 1)[0]
    if not host or host.startswith("?"):
        return False
    return True


def sanitize_image_url(value: str | None) -> str | None:
    """Return a normalized safe URL or ``None`` if the input cannot be trusted.

    Wraps :func:`validate_image_url` with light cleanup (strip whitespace)
    and falls back to ``None`` for anything that fails validation.  Callers
    should substitute a placeholder when they get ``None`` back.
    """
    if not value or not isinstance(value, str):
        return None
    candidate = value.strip()
    if not validate_image_url(candidate):
        return None
    return candidate


def normalize_public_image_url(value: str | None) -> str | None:
    """Keep merchant HTTP(S) URLs intact and turn managed keys into public URLs."""
    if not value:
        return value
    sanitized = sanitize_image_url(value)
    if sanitized is not None:
        return sanitized
    # Fall back to the managed-key path for values like ``results/abc.jpg``
    # that are not URLs at all but resolve through ``media_storage``.
    try:
        return media_storage.get_public_url(value.strip())
    except ValueError:
        return None


def _build_storage() -> MediaStorage:
    provider = os.getenv("MEDIA_STORAGE", "local").strip().lower()
    if provider != "local":
        raise RuntimeError(
            f"MEDIA_STORAGE={provider!r} is not configured. Configure a provider adapter or use MEDIA_STORAGE=local."
        )
    return LocalMediaStorage()


media_storage = _build_storage()
