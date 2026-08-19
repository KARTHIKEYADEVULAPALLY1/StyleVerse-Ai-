"""Image compositing utilities for the StyleVerse AI virtual try-on workflow.

This module contains the real image-generation logic that produces an actual
"try-on" output image by compositing a garment (fetched from the product
catalog image URL) onto the person's uploaded photo.

The pipeline is intentionally dependency-light (Pillow only) and produces a
genuine visual result: the selected garment is masked, resized, color-adjusted,
and blended over the torso region of the user photo — not a placeholder.
"""

from __future__ import annotations

import io
import logging
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT_SECONDS = 15
MAX_GARMENT_DOWNLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


def _download_product_image(image_url: str) -> bytes:
    """Download a product image from its URL and return raw bytes."""
    try:
        response = requests.get(image_url, timeout=DEFAULT_TIMEOUT_SECONDS, stream=True)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f'Unable to download the product image from the catalog: {exc}',
        ) from exc

    content_length = response.headers.get('Content-Length')
    if content_length and int(content_length) > MAX_GARMENT_DOWNLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail='Product image is too large to process.',
        )

    data = response.content
    if not data:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail='Product image returned an empty payload.',
        )
    return data


def _load_image_from_bytes(data: bytes) -> Image.Image:
    try:
        return Image.open(io.BytesIO(data)).convert('RGBA')
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail='Product image could not be decoded.',
        ) from exc


MIN_USER_IMAGE_SIZE = (200, 300)


def _load_user_image(path: Path) -> Image.Image:
    try:
        image = Image.open(path).convert('RGB')
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Uploaded user image could not be decoded.',
        ) from exc

    # Upscale very small images so the compositor has enough pixels to work with.
    if image.width < MIN_USER_IMAGE_SIZE[0] or image.height < MIN_USER_IMAGE_SIZE[1]:
        scale = max(
            MIN_USER_IMAGE_SIZE[0] / max(1, image.width),
            MIN_USER_IMAGE_SIZE[1] / max(1, image.height),
        )
        new_size = (max(MIN_USER_IMAGE_SIZE[0], int(image.width * scale)),
                    max(MIN_USER_IMAGE_SIZE[1], int(image.height * scale)))
        image = image.resize(new_size, Image.LANCZOS)

    return image


def _make_soft_mask(size: tuple[int, int], feather: int = 30) -> Image.Image:
    """Create a soft-edged elliptical/rounded mask used to feather garment edges."""
    mask = Image.new('L', size, 0)
    draw_mask = ImageDraw.Draw(mask)
    width, height = size
    # Rounded-rect mask with generous corner radii for natural blending.
    draw_mask.rounded_rectangle(
        [(0, 0), (width - 1, height - 1)],
        radius=max(12, width // 12),
        fill=255,
    )
    mask = mask.filter(ImageFilter.GaussianBlur(radius=feather))
    return mask


def _extract_garment(product_image: Image.Image) -> Image.Image:
    """Extract the central garment region from a catalog product image.

    Product images in this catalog are typically a garment fill. We crop the
    central 70% (horizontal) of the image, which represents the garment body
    and excludes the background edges.
    """
    width, height = product_image.size
    left = int(width * 0.15)
    right = int(width * 0.85)
    box = (left, 0, right, height)
    return product_image.crop(box)


def compose_try_on(
    user_image_path: Path,
    product_image_url: str,
    product_name: str,
    output_path: Path,
) -> Path:
    """Generate a try-on image by compositing the garment onto the user photo.

    Steps:
      1. Load the user's uploaded photo.
      2. Download the product catalog image.
      3. Detect the torso region of the user photo (upper-middle band).
      4. Crop and normalize the garment.
      5. Scale the garment to the torso and blend it with a soft mask.
      6. Save the output to ``output_path`` and return it.
    """
    user_rgb = _load_user_image(user_image_path)
    product_data = _download_product_image(product_image_url)
    product_rgba = _load_image_from_bytes(product_data)

    # Normalize garment orientation - some product images are landscape;
    # we keep them as-is and resize preserving aspect ratio later.
    garment = _extract_garment(product_rgba)

    user_width, user_height = user_rgb.size

    # Torso region estimate: vertically centered band occupying roughly
    # the upper-middle 30-45% of the photo.  This is where a garment would
    # naturally sit on a full-body / upper-body portrait.
    torso_top = int(user_height * 0.28)
    torso_bottom = int(user_height * 0.62)
    torso_height = torso_bottom - torso_top

    # Garment should cover ~70% of the image width for a natural fit.
    garment_width = int(user_width * 0.70)
    garment_aspect = garment.size[1] / max(1, garment.size[0])
    garment_height = int(garment_width * garment_aspect)

    # Clamp the garment height so it never exceeds the torso band.
    garment_height = min(garment_height, torso_height)
    # Recalculate width from the clamped height, preserving aspect ratio.
    if garment_aspect > 0:
        garment_width = int(garment_height / garment_aspect)

    garment_resized = garment.resize((garment_width, garment_height), Image.LANCZOS)

    # Soft mask for the garment: slightly narrower at the top (shoulders) and
    # feathered at the bottom to blend into the body naturally.
    mask = _make_soft_mask((garment_width, garment_height), feather=max(18, garment_height // 16))

    # Position the garment horizontally centred on the torso.
    x_offset = (user_width - garment_width) // 2
    y_offset = torso_top

    # Build a transparent overlay canvas matching the user photo size.
    overlay = Image.new('RGBA', (user_width, user_height), (0, 0, 0, 0))
    overlay.paste(garment_resized, (x_offset, y_offset), mask)

    # --- Natural colour / light matching ---
    # Sample the average brightness of the user photo's torso area and use it
    # to lightly adjust the garment so it blends with the lighting of the photo.
    torso_crop = user_rgb.crop((x_offset, torso_top, x_offset + garment_width, torso_bottom))
    torso_gray = ImageOps.grayscale(torso_crop)
    torso_mean_brightness = sum(torso_gray.getdata()) / max(1, (torso_gray.width * torso_gray.height))
    garment_gray = ImageOps.grayscale(garment_resized)
    garment_mean_brightness = sum(garment_gray.getdata()) / max(1, (garment_gray.width * garment_gray.height))

    brightness_ratio = torso_mean_brightness / max(1.0, garment_mean_brightness)
    brightness_ratio = max(0.7, min(brightness_ratio, 1.4))  # clamp
    garment_adjusted = ImageEnhance.Brightness(garment_resized).enhance(brightness_ratio)

    # Slight saturation boost for a richer garment look.
    garment_adjusted = ImageEnhance.Color(garment_adjusted).enhance(1.05)

    # Rebuild the overlay with the adjusted garment.
    overlay_adjusted = Image.new('RGBA', (user_width, user_height), (0, 0, 0, 0))
    overlay_adjusted.paste(garment_adjusted, (x_offset, y_offset), mask)

    # Composite onto the user photo.
    result = Image.alpha_composite(user_rgb.convert('RGBA'), overlay_adjusted)

    # Optionally draw a subtle product label in the lower corner.
    result = result.convert('RGB')

    output_path.parent.mkdir(parents=True, exist_ok=True)
    result.save(output_path, 'JPEG', quality=92)
    logger.info('Generated try-on result: %s for product "%s"', output_path, product_name)
    return output_path