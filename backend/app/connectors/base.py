"""Connector interface for merchant product sources.

A connector is the only component that knows how to talk to a specific
merchant source (API, feed, file export, ...). It must always return
normalized ``ExternalProduct`` records - never raw payloads and never
database models.

Future implementations may include::

    AmazonConnector        (live Amazon Product Advertising API)
    MyntraConnector        (partner API / feed)
    AjioConnector          (partner API / feed)
    ShopifyConnector       (Shopify Admin / Storefront API)
    MerchantFeedConnector  (generic CSV/JSON product feeds)

No live integrations are implemented in this step.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import List, Optional

from app.schemas.external_product import ExternalProduct


class ConnectorError(RuntimeError):
    """Raised when a connector cannot retrieve data from its source."""


class ProductConnector(ABC):
    """Abstract interface every merchant connector must implement."""

    #: Unique slug of the merchant this connector serves (e.g. "amazon").
    merchant_slug: str = ''

    @abstractmethod
    def fetch_products(self) -> List[ExternalProduct]:
        """Return all products currently available from the source."""

    @abstractmethod
    def fetch_product_details(self, external_product_id: str) -> Optional[ExternalProduct]:
        """Return a single product by the merchant's own product id, or None."""

    def is_available(self) -> bool:
        """Whether the connector's source can currently be reached."""
        return True