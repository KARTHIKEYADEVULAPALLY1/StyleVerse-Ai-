"""Development-only connector that reads sample merchant data from JSON files.

The mock connector implements exactly the same interface a future live
connector (Amazon, Myntra, Ajio, Shopify, ...) will implement, so the
ingestion pipeline can be built and tested without external API credentials.

Expected file layout::

    backend/
    └── data/
        └── merchant_products/
            ├── amazon.json
            ├── myntra.json
            └── ajio.json

Each JSON file has the shape::

    {
      "merchant": "amazon",
      "products": [ { ...ExternalProduct fields... }, ... ]
    }
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import List, Optional

from app.connectors.base import ConnectorError, ProductConnector
from app.schemas.external_product import ExternalProduct

# backend/app/connectors/mock_connector.py -> parents[2] == backend/
BACKEND_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DATA_DIR = BACKEND_DIR / 'data' / 'merchant_products'


class MockFileConnector(ProductConnector):
    """Reads merchant products from ``<data_dir>/<merchant_slug>.json``."""

    def __init__(self, merchant_slug: str, data_dir: Optional[Path] = None) -> None:
        self.merchant_slug = merchant_slug.strip().lower()
        self.data_dir = Path(data_dir) if data_dir else DEFAULT_DATA_DIR

    @property
    def source_path(self) -> Path:
        return self.data_dir / f'{self.merchant_slug}.json'

    def is_available(self) -> bool:
        return self.source_path.exists()

    def _load_raw(self) -> dict:
        if not self.source_path.exists():
            raise ConnectorError(
                f'Mock merchant data file not found for slug "{self.merchant_slug}": '
                f'{self.source_path}'
            )
        try:
            with self.source_path.open('r', encoding='utf-8') as handle:
                return json.load(handle)
        except json.JSONDecodeError as exc:
            raise ConnectorError(
                f'Mock merchant data file is not valid JSON: {self.source_path}'
            ) from exc

    def fetch_products(self) -> List[ExternalProduct]:
        raw = self._load_raw()
        items = raw.get('products', [])
        products: List[ExternalProduct] = []
        for index, item in enumerate(items):
            # Guarantee the connector-level fields even if a sample file omits them.
            item.setdefault('merchant', self.merchant_slug)
            if not item.get('external_product_id'):
                item['external_product_id'] = f'{self.merchant_slug}-{index + 1}'
            products.append(ExternalProduct.model_validate(item))
        return products

    def fetch_product_details(self, external_product_id: str) -> Optional[ExternalProduct]:
        for product in self.fetch_products():
            if product.external_product_id == external_product_id:
                return product
        return None


# Convenience aliases so future code can reference named connectors today.
AmazonConnector = lambda data_dir=None: MockFileConnector('amazon', data_dir)  # noqa: E731
MyntraConnector = lambda data_dir=None: MockFileConnector('myntra', data_dir)  # noqa: E731
AjioConnector = lambda data_dir=None: MockFileConnector('ajio', data_dir)  # noqa: E731
FlipkartConnector = lambda data_dir=None: MockFileConnector('flipkart', data_dir)  # noqa: E731