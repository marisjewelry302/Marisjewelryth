"use client";

import { useMemo, useState } from "react";
import ProductCard from "../../components/ProductCard";
import {
  buildCatalogueFilterGroups,
  getProductCarat,
  productMatchesFacetToken
} from "../../lib/product-facets";

const BASE_SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "code-asc", label: "Product Code A-Z" }
];

const CARAT_SORT_OPTIONS = [
  { value: "carat-desc", label: "Carat: High to Low" },
  { value: "carat-asc", label: "Carat: Low to High" }
];

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

export default function CategoryProducts({ products, collectionTitle }) {
  const [sortBy, setSortBy] = useState("featured");
  const [filterBy, setFilterBy] = useState("all");

  const filterGroups = useMemo(() => buildCatalogueFilterGroups(products), [products]);

  // Carat is never recorded in the catalogue today, so the carat sorts only appear
  // once a piece carries one; otherwise they would reorder nothing.
  const sortOptions = useMemo(() => (
    products.some((product) => getProductCarat(product) > 0)
      ? [...BASE_SORT_OPTIONS, ...CARAT_SORT_OPTIONS]
      : BASE_SORT_OPTIONS
  ), [products]);

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
      <section className="catalogue-toolbar" aria-label="Catalogue controls">
        <div className="toolbar-group">
          <label htmlFor="sort-by">Sort by</label>
          <select id="sort-by" className="catalogue-select" value={activeSort} onChange={(event) => setSortBy(event.target.value)}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <p className="catalogue-count">{visibleProducts.length} {visibleProducts.length === 1 ? "piece" : "pieces"}</p>

        {filterGroups.length ? (
          <div className="toolbar-group toolbar-group-right">
            <label htmlFor="filter-by">Filter</label>
            <select id="filter-by" className="catalogue-select" value={activeFilter} onChange={(event) => setFilterBy(event.target.value)}>
              <option value="all">All Pieces ({products.length})</option>
              {filterGroups.map((group) => (
                <optgroup key={group.key} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option.token} value={option.token}>{option.label} ({option.count})</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        ) : null}
      </section>

      <section className="products" aria-label={`${collectionTitle} products`}>
        <h2 className="sr-only">Available {collectionTitle}</h2>
        {visibleProducts.length ? (
          visibleProducts.map((product) => (
            <ProductCard key={product.id || product.sku} product={product} collectionLabel={collectionTitle} />
          ))
        ) : (
          <div className="catalogue-empty">
            No products are available in this collection yet. Please contact Maris Jewelry for current availability.
          </div>
        )}
      </section>
    </>
  );
}
