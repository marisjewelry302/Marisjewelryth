"use client";

import { useMemo, useState } from "react";
import ProductCard from "../../components/ProductCard";
import { getPublicProductDisplayName, getPublicVariantDisplayName } from "../../lib/product-display";

function parseCarat(product) {
  const text = [
    product.name,
    product.sku,
    ...(Array.isArray(product.variants) ? product.variants.map((variant) => `${variant.variantName} ${variant.material} ${variant.size}`) : [])
  ].join(" ");
  const match = text.match(/([\d.]+)\s*ct/i);
  return match ? Number(match[1]) : 0;
}

function getSearchText(product) {
  return [
    getPublicProductDisplayName(product),
    product.category,
    product.collection,
    ...(Array.isArray(product.variants) ? product.variants.map((variant) => getPublicVariantDisplayName(variant)) : [])
  ]
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function matchesFilter(product, filter) {
  if (filter === "all") {
    return true;
  }

  return getSearchText(product).replace(/\s+/g, "-").includes(filter);
}

function sortProducts(products, mode) {
  const nextProducts = [...products];

  if (mode === "code-asc") {
    nextProducts.sort((left, right) => String(left.sku).localeCompare(String(right.sku), undefined, { numeric: true }));
  }

  if (mode === "carat-desc") {
    nextProducts.sort((left, right) => parseCarat(right) - parseCarat(left));
  }

  if (mode === "carat-asc") {
    nextProducts.sort((left, right) => parseCarat(left) - parseCarat(right));
  }

  return nextProducts;
}

export default function CategoryProducts({ products, collectionTitle }) {
  const [sortBy, setSortBy] = useState("featured");
  const [filterBy, setFilterBy] = useState("all");

  const visibleProducts = useMemo(() => {
    const filteredProducts = products.filter((product) => matchesFilter(product, filterBy));
    return sortProducts(filteredProducts, sortBy).map((product) => ({
      ...product,
      searchCarat: parseCarat(product),
      searchText: getSearchText(product)
    }));
  }, [filterBy, products, sortBy]);

  return (
    <>
      <section className="catalogue-toolbar" aria-label="Catalogue controls">
        <div className="toolbar-group">
          <label htmlFor="sort-by">Sort by</label>
          <select id="sort-by" className="catalogue-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="featured">Featured</option>
            <option value="code-asc">Product Code A-Z</option>
            <option value="carat-desc">Carat: High to Low</option>
            <option value="carat-asc">Carat: Low to High</option>
          </select>
        </div>

        <p className="catalogue-count">{visibleProducts.length} pieces</p>

        <div className="toolbar-group toolbar-group-right">
          <label htmlFor="filter-by">Filter</label>
          <select id="filter-by" className="catalogue-select" value={filterBy} onChange={(event) => setFilterBy(event.target.value)}>
            <option value="all">All Pieces</option>
            <option value="white-gold">White Gold</option>
            <option value="yellow-gold">Yellow Gold</option>
            <option value="rose-gold">Rose Gold</option>
            <option value="halo">Halo Setting</option>
            <option value="solitaire">Solitaire</option>
            <option value="band">Band</option>
          </select>
        </div>
      </section>

      <section className="products" aria-label={`${collectionTitle} products`}>
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
