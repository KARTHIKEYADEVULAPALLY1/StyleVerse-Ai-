"""Connector registry.

Maps merchant slugs to connector factories. When a real integration is added
later, register it here (e.g. ``'amazon': lambda: AmazonAPIConnector(...)``)
and the ingestion pipeline picks it up without any other changes.
"""
from __future__ import annotations

from pathlib import Path
from typing import Callable, Dict, List, Optional

from app.connectors.base import ConnectorError, ProductConnector
from app.connectors.mock_connector import MockFileConnector

# Slugs that currently have mock sample data available for development.
MOCK_MERCHANT_SLUGS = ['amazon', 'myntra', 'ajio', 'flipkart']

_CONNECTOR_FACTORIES: Dict[str, Callable[[Optional[Path]], ProductConnector]] = {
    slug: (lambda data_dir=None, _slug=slug: MockFileConnector(_slug, data_dir))
    for slug in MOCK_MERCHANT_SLUGS
}


def get_connector(merchant_slug: str, data_dir: Optional[Path] = None) -> ProductConnector:
    """Return the connector registered for a merchant slug."""
    slug = (merchant_slug or '').strip().lower()
    factory = _CONNECTOR_FACTORIES.get(slug)
    if factory is None:
        raise ConnectorError(
            f'No product connector registered for merchant slug "{slug}". '
            f'Available slugs: {sorted(_CONNECTOR_FACTORIES)}'
        )
    return factory(data_dir)


def list_available_connectors() -> List[str]:
    """Slugs of connectors that are registered and whose source is available."""
    available = []
    for slug, factory in sorted(_CONNECTOR_FACTORIES.items()):
        try:
            if factory(None).is_available():
                available.append(slug)
        except Exception:
            continue
    return available


__all__ = [
    'ProductConnector',
    'ConnectorError',
    'MockFileConnector',
    'get_connector',
    'list_available_connectors',
    'MOCK_MERCHANT_SLUGS',
]