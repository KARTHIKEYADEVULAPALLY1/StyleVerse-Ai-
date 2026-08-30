from pathlib import Path

import pytest

from app.services.media_storage import (
    LocalMediaStorage,
    safe_filename,
    sanitize_image_url,
    validate_image_url,
)


def test_local_storage_saves_and_generates_stable_url(tmp_path: Path) -> None:
    storage = LocalMediaStorage(root=tmp_path, base_url="https://cdn.example/media")
    key = "results/abc.jpg"
    storage.save(key, b"image")
    assert storage.exists(key)
    assert storage.get_public_url(key) == "https://cdn.example/media/results/abc.jpg"
    assert storage.get_path(key).read_bytes() == b"image"
    storage.delete(key)
    assert not storage.exists(key)


@pytest.mark.parametrize("key", ["../secret.jpg", "/absolute.jpg", "a/../../secret.jpg"])
def test_storage_rejects_unsafe_keys(tmp_path: Path, key: str) -> None:
    storage = LocalMediaStorage(root=tmp_path)
    with pytest.raises(ValueError):
        storage.save(key, b"x")


def test_safe_filename_is_generated_and_never_uses_client_name() -> None:
    filename = safe_filename(".png")
    assert filename.endswith(".png")
    assert len(filename) == 36


# --- Image URL validation ---------------------------------------------------


@pytest.mark.parametrize(
    "url",
    [
        "https://cdn.example.com/products/shoe.jpg",
        "http://cdn.example.com/products/shoe.jpg",
        "https://images.unsplash.com/photo-1?w=400&q=80",
        "/media/results/abc.jpg",
        "/uploads/catalog/1.png",
    ],
)
def test_validate_image_url_accepts_safe_urls(url: str) -> None:
    assert validate_image_url(url) is True
    # sanitize is idempotent and returns a stripped value
    assert sanitize_image_url(url) == url


def test_validate_image_url_strips_whitespace() -> None:
    assert validate_image_url("  https://example.com/x.jpg  ") is True
    assert sanitize_image_url("  https://example.com/x.jpg  ") == "https://example.com/x.jpg"


@pytest.mark.parametrize(
    "url",
    [
        None,
        "",
        "   ",
        "not a url",
        "example.com/path.jpg",  # missing scheme
        "https://",  # scheme but no host or path
        "https://example.com",  # no path component
        "://example.com/path",
        "javascript:alert(1)",
        "JavaScript:alert(1)",
        "javascript&#58;alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "data:image/png;base64,iVBORw0KGgo=",
        "file:///etc/passwd",
        "FILE:///etc/passwd",
        "vbscript:msgbox(1)",
        "ftp://example.com/x.jpg",
        "ftps://example.com/x.jpg",
        "//example.com/x.jpg",  # protocol-relative
        "/",  # bare slash, no path
        "//etc/passwd",
    ],
)
def test_validate_image_url_rejects_unsafe_urls(url) -> None:
    assert validate_image_url(url) is False
    assert sanitize_image_url(url) is None


def test_validate_image_url_rejects_oversized_strings() -> None:
    huge = "https://example.com/" + ("a" * 3000)
    assert validate_image_url(huge) is False
    assert sanitize_image_url(huge) is None


def test_validate_image_url_does_not_make_network_calls(monkeypatch) -> None:
    """The validator must be a pure-format check - no socket activity."""
    import socket

    blocked: list[tuple] = []

    def _explode(*args, **kwargs):  # pragma: no cover - guard
        blocked.append((args, kwargs))
        raise AssertionError("validate_image_url must not touch the network")

    monkeypatch.setattr(socket, "gethostbyname", _explode, raising=True)
    monkeypatch.setattr(socket, "create_connection", _explode, raising=True)
    assert validate_image_url("https://example.com/x.jpg") is True
    assert blocked == []
