"use client";

import { useShopLocale } from "../hooks/useShopLocale";

// Where a shopper can go from an empty catalogue page. Styled in
// assets/css/category.css, which every page that renders this already loads.
export default function CatalogueEmptyLinks({ links }) {
  const { href } = useShopLocale();

  return (
    <ul className="catalogue-empty-links">
      {links.map((link) => (
        <li key={link.href}>
          <a href={href(link.href)}>{link.label}</a>
        </li>
      ))}
    </ul>
  );
}
