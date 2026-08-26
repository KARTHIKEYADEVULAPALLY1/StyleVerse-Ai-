"""Product deduplication / matching.

Decides whether an incoming ``ExternalProduct`` from a merchant represents
the same real-world item as an existing StyleVerse ``Product``.

The default strategy is intentionally simple and heuristic (brand +
normalized name + category signals). It is deliberately kept behind a small
strategy interface so it can be replaced later by a smarter matcher
(embedding similarity, ML model, human review queue, ...) without touching
the ingestion pipeline.
"""
from __future__ import annotations

from typing import List, Optional, Protocol

from sqlalchemy.orm import Session

from app.models.product import Product
from app.schemas.external_product import ExternalProduct
from app.services.normalization_service import (
    normalize_brand,
    normalize_category,
    normalized_name_tokens,
)

#: Jaccard token-similarity threshold for the fuzzy stage of matching.
FUZZY_NAME_THRESHOLD = 0.6


def _name_similarity(left: str, right: str) -> float:
    """Jaccard similarity between the token sets of two product names."""
    left_tokens = set(normalized_name_tokens(left))
    right_tokens = set(normalized_name_tokens(right))
    if not left_tokens or not right_tokens:
        return 0.0
    intersection = left_tokens & right_tokens
    union = left_tokens | right_tokens
    return len(intersection) / len(union)


class ProductMatchingStrategy(Protocol):
    """Interface for pluggable product-matching strategies."""

    def find_matching_product(
        self,
        db: Session,
        external: ExternalProduct,
        candidates: Optional[List[Product]] = None,
    ) -> Optional[Product]:
        """Return the existing StyleVerse product this external item maps to, if any."""
        ...


class HeuristicProductMatcher:
    """Default rule-based matcher using brand + normalized name + category.

    Stage 1 (exact):  same brand AND same normalized name AND same category.
    Stage 2 (fuzzy):  same brand AND same category AND name token similarity
                      >= ``FUZZY_NAME_THRESHOLD``.
    """

    def __init__(self, fuzzy_threshold: float = FUZZY_NAME_THRESHOLD) -> None:
        self.fuzzy_threshold = fuzzy_threshold

    def _candidate_products(self, db: Session, candidates: Optional[List[Product]]) -> List[Product]:
        if candidates is not None:
            return candidates
        return db.query(Product).all()

    def find_matching_product(
        self,
        db: Session,
        external: ExternalProduct,
        candidates: Optional[List[Product]] = None,
    ) -> Optional[Product]:
        external_brand = normalize_brand(external.brand).lower()
        external_category = normalize_category(external.category)
        external_name = ' '.join(normalized_name_tokens(external.name))

        exact_candidate: Optional[Product] = None
        fuzzy_best: tuple[float, Product] | None = None

        for product in self._candidate_products(db, candidates):
            product_brand = normalize_brand(product.brand).lower()
            if external_brand and product_brand and external_brand != product_brand:
                continue

            product_category = normalize_category(product.category)
            if external_category != product_category:
                continue

            product_name = ' '.join(normalized_name_tokens(product.name))

            # Stage 1 - exact normalized identity.
            if external_name and external_name == product_name:
                return product

            # Stage 2 - fuzzy token similarity within same brand + category.
            score = _name_similarity(external.name, product.name)
            if score >= self.fuzzy_threshold:
                if fuzzy_best is None or score > fuzzy_best[0]:
                    fuzzy_best = (score, product)

        if exact_candidate is not None:  # pragma: no cover - defensive
            return exact_candidate
        return fuzzy_best[1] if fuzzy_best else None


_default_matcher: ProductMatchingStrategy = HeuristicProductMatcher()


def get_product_matcher() -> ProductMatchingStrategy:
    """Return the currently installed matching strategy."""
    return _default_matcher


def set_product_matcher(matcher: ProductMatchingStrategy) -> None:
    """Replace the matching strategy (keeps dedup logic swappable)."""
    global _default_matcher
    _default_matcher = matcher


def find_matching_product(
    db: Session,
    external: ExternalProduct,
    candidates: Optional[List[Product]] = None,
) -> Optional[Product]:
    """Convenience passthrough to the active matching strategy."""
    return get_product_matcher().find_matching_product(db, external, candidates)