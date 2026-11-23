"use client";

import { Suspense, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CatalogueEmptyLinks from "../../components/CatalogueEmptyLinks";
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


// "newest" is the catalogue's own order (most recently updated first). It used
// to be called "featured", so ?sort=featured links still resolve to it.
const DEFAULT_SORT = "newest";
const LEGACY_SORT_ALIASES = { featured: DEFAULT_SORT };

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

// Sort and filter live in the URL (?sort=code-asc&filter=shape:pear) so Back
// restores both the control and the grid, and a filtered view can be shared.
function CategoryProductsWithUrlState(props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const setParam = useCallback((key, value, fallback) => {
    const next = new URLSearchParams(searchParams?.toString() || "");

    if (!value || value === fallback) {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return (
    <CategoryProductsView
      {...props}
      sortBy={searchParams?.get("sort") || DEFAULT_SORT}
      filterBy={searchParams?.get("filter") || "all"}
      onSortChange={(value) => setParam("sort", value, DEFAULT_SORT)}
      onFilterChange={(value) => setParam("filter", value, "all")}
    />
  );
}

// The server-rendered grid (and the Suspense fallback) shows every piece at the
// default order, so crawlers and no-JS visitors still get the full catalogue.
export default function CategoryProducts(props) {
  return (
    <Suspense fallback={<CategoryProductsView {...props} />}>
      <CategoryProductsWithUrlState {...props} />
    </Suspense>
  );
}

function CategoryProductsView({
  products,
  collectionTitle,
  collectionSlug = "",
  sortBy = DEFAULT_SORT,
  filterBy = "all",
  onSortChange = () => {},
  onFilterChange = () => {}
}) {
  const { t } = useShopLocale();
  const copy = t.catalogue;
  const BASE_SORT_OPTIONS = [
    { value: DEFAULT_SORT, label: copy.newest },
    { value: "code-asc", label: copy.codeAsc }
  ];
  const CARAT_SORT_OPTIONS = [
    { value: "carat-desc", label: copy.caratDesc },
    { value: "carat-asc", label: copy.caratAsc }
  ];

  const filterGroups = useMemo(() => buildCatalogueFilterGroups(products), [products]);

  // The carat sorts only appear once a piece carries a carat weight (specs or
  // gem report); otherwise they would reorder nothing.
  const sortOptions = useMemo(() => (
    products.some((product) => getProductCarat(product) > 0)
      ? [...BASE_SORT_OPTIONS, ...CARAT_SORT_OPTIONS]
      : BASE_SORT_OPTIONS
  ), [products, copy]);

  // Options are derived from the pieces on the page, so a choice in the URL can
  // stop existing when the collection changes. Fall back instead of showing a
  // control whose value is not in its own list.
  const requestedSort = LEGACY_SORT_ALIASES[sortBy] || sortBy;
  const activeSort = sortOptions.some((option) => option.value === requestedSort) ? requestedSort : DEFAULT_SORT;
  const activeFilter = filterGroups.some((group) => group.options.some((option) => option.token === filterBy))
    ? filterBy
    : "all";

  const visibleProducts = useMemo(() => {
    const filteredProducts = products.filter((product) => productMatchesFacetToken(product, activeFilter));
    return sortProducts(filteredProducts, activeSort);
  }, [activeFilter, activeSort, products]);

  // A collection with nothing in it has nothing to sort or filter, so only the
  // message and the ways onward are shown.
  const isEmptyCollection = products.length === 0;

  return (
    <>
      {!isEmptyCollection && (
      <section className="catalogue-toolbar" aria-label={copy.controls}>
        <div className="toolbar-group">
          <label htmlFor="sort-by">{copy.sortBy}</label>
          <select id="sort-by" className="catalogue-select" value={activeSort} autoComplete="off" onChange={(event) => onSortChange(event.target.value)}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <p className="catalogue-count">{visibleProducts.length} {visibleProducts.length === 1 ? copy.piece : copy.pieces}</p>

        {filterGroups.length ? (
          <div className="toolbar-group toolbar-group-right">
            <label htmlFor="filter-by">{copy.filter}</label>
            <select id="filter-by" className="catalogue-select" value={activeFilter} autoComplete="off" onChange={(event) => onFilterChange(event.target.value)}>
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
      )}

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
            <p>{copy.empty}</p>
            <CatalogueEmptyLinks
              links={[
                { href: "/collections", label: copy.emptyLinks.collections },
                ...(collectionSlug === "engagement-ring"
                  ? []
                  : [{ href: "/category/engagement-ring", label: copy.emptyLinks.engagementRings }]),
                { href: "/contact-order/custom-order", label: copy.emptyLinks.custom },
                { href: "/contact-us", label: copy.emptyLinks.contact }
              ]}
            />
          </div>
        )}
      </section>
    </>
  );
}
