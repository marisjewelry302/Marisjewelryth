"use client";

import { useMemo, useState } from "react";
import ProductCard from "../../components/ProductCard";
import { useShopLocale } from "../../hooks/useShopLocale";
import {
  buildCatalogueFilterGroups,
  getProductCarat,
  productMatchesFacetToken
} from "../../lib/product-facets";

// The widest grid shows four cards per row, and only that first row can sit in
// the opening viewport, so loading exactly those eagerly costs nothing further down.
const ABOVE_FOLD_CARD_COUNT = 4;


function sortProducts(products, mode) {
  const nextProducts = [...products];

  if (mode === "code-asc") {
    nextProducts.sort((left, right) => String(left.sku).localeCompare(String(right.sku), undefined, { numeric: true }));
  }

  if (mode === "carat-desc") {
    nextProducts.sort((left, right) => getProductCarat(right) - getProductCarat(left));
  }

  if (mode === "carat-asc") {
    nextProducts.sort((left, right) => getProductCarat(left) - getProductCarat(right));
  }

  return nextProducts;
}

export default function CategoryProducts({ products, collectionTitle, collectionSlug = "" }) {
  const { t } = useShopLocale();
  const copy = t.catalogue;
  const BASE_SORT_OPTIONS = [
    { value: "featured", label: copy.featured },
    { value: "code-asc", label: copy.codeAsc }
  ];
  const CARAT_SORT_OPTIONS = [
    { value: "carat-desc", label: copy.caratDesc },
    { value: "carat-asc", label: copy.caratAsc }
  ];
  const [sortBy, setSortBy] = useState("featured");
  const [filterBy, setFilterBy] = useState("all");

  const filterGroups = useMemo(() => buildCatalogueFilterGroups(products), [products]);

  // Carat is never recorded in the catalogue today, so the carat sorts only appear
  // once a piece carries one; otherwise they would reorder nothing.
  const sortOptions = useMemo(() => (
    products.some((product) => getProductCarat(product) > 0)
      ? [...BASE_SORT_OPTIONS, ...CARAT_SORT_OPTIONS]
      : BASE_SORT_OPTIONS
  ), [products, copy]);

  // Options are derived from the pieces on the page, so a remembered choice can
  // stop existing when the collection changes. Fall back instead of showing a
  // control whose value is not in its own list.
  const activeSort = sortOptions.some((option) => option.value === sortBy) ? sortBy : "featured";
  const activeFilter = filterGroups.some((group) => group.options.some((option) => option.token === filterBy))
    ? filterBy
    : "all";

  const visibleProducts = useMemo(() => {
    const filteredProducts = products.filter((product) => productMatchesFacetToken(product, activeFilter));
    return sortProducts(filteredProducts, activeSort);
  }, [activeFilter, activeSort, products]);

  return (
    <>
      <section className="catalogue-toolbar" aria-label={copy.controls}>
        <div className="toolbar-group">
          <label htmlFor="sort-by">{copy.sortBy}</label>
          <select id="sort-by" className="catalogue-select" value={activeSort} onChange={(event) => setSortBy(event.target.value)}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <p className="catalogue-count">{visibleProducts.length} {visibleProducts.length === 1 ? copy.piece : copy.pieces}</p>

        {filterGroups.length ? (
          <div className="toolbar-group toolbar-group-right">
            <label htmlFor="filter-by">{copy.filter}</label>
            <select id="filter-by" className="catalogue-select" value={activeFilter} onChange={(event) => setFilterBy(event.target.value)}>
              <option value="all">{copy.allPieces} ({products.length})</option>
              {filterGroups.map((group) => (
                <optgroup key={group.key} label={copy.groups[group.key] || group.label}>
                  {group.options.map((option) => (
                    <option key={option.token} value={option.token}>{copy.values[option.token] || option.label} ({option.count})</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        ) : null}
      </section>

      <section className="products" aria-label={`${collectionTitle} ${copy.productsLabel}`}>
        <h2 className="sr-only">{copy.available} {collectionTitle}</h2>
        {visibleProducts.length ? (
          visibleProducts.map((product, index) => (
            <ProductCard
              key={product.id || product.sku}
              product={product}
              collectionLabel={collectionTitle}
              collectionSlug={collectionSlug}
              isAboveFold={index < ABOVE_FOLD_CARD_COUNT}
            />
          ))
        ) : (
          <div className="catalogue-empty">
            {copy.empty}
          </div>
        )}
      </section>
    </>
  );
}
