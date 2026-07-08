import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const adminPage = await readFile(new URL("../app/admin/page.js", import.meta.url), "utf8");
const adminScript = await readFile(new URL("../assets/js/admin-page.js", import.meta.url), "utf8");
const adminCss = await readFile(new URL("../app/admin/admin.css", import.meta.url), "utf8");

assert.match(
  adminPage,
  /data-products-search/,
  "Admin products panel should include a search input for filtering product lists"
);

assert.match(
  adminPage,
  /data-products-pagination/,
  "Admin products panel should include pagination controls for product lists"
);

assert.match(
  adminPage,
  /data-products-page-summary/,
  "Admin products panel should include a visible page summary for the product list"
);

assert.match(
  adminScript,
  /PRODUCT_LIST_PAGE_SIZE\s*=\s*5/,
  "Admin product list should show 5 products per page"
);

assert.match(
  adminScript,
  /function getProductSearchText\(/,
  "Admin script should build searchable text from each product"
);

assert.match(
  adminScript,
  /function getProductListView\(/,
  "Admin script should calculate the filtered and paginated product list view"
);

assert.match(
  adminScript,
  /renderProductListControls\(view\)/,
  "Admin script should render search result summary and page tabs from the current list view"
);

assert.match(
  adminScript,
  /elements\.productSearch\?\.addEventListener\("input"/,
  "Admin product search should update the list while typing"
);

assert.match(
  adminScript,
  /data-products-page/,
  "Admin pagination should use explicit product page buttons"
);

assert.match(
  adminScript,
  /view\.pageProducts\s*\.map\(/,
  "Admin product tables should render only products for the active page"
);

assert.match(
  adminCss,
  /\.admin-list-tools/,
  "Admin product list controls should have dedicated styling"
);

assert.match(
  adminCss,
  /\.admin-pagination/,
  "Admin product pagination tabs should have dedicated styling"
);

console.log("PASS: Admin product list search and pagination contract is wired.");
