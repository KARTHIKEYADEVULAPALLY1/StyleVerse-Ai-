"""Conservative Pillow processing for validated images."""
from __future__ import annotations

from io import BytesIO
from PIL import Image, UnidentifiedImageError


def optimize_image(data: bytes, detected_extension: str, max_dimension: int = 2048) -> tuple[bytes, str]:
    """Validate decodability and downsize oversized uploads without upscaling."""
    try:
        image = Image.open(BytesIO(data))
        image.verify()
        image = Image.open(BytesIO(data))
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("Invalid or corrupt image data") from exc
    image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
    output = BytesIO()
    if detected_extension == ".png":
        image.save(output, format="PNG", optimize=True)
        return output.getvalue(), ".png"
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    image.save(output, format="JPEG", quality=88, optimize=True)
    return output.getvalue(), ".jpg"
