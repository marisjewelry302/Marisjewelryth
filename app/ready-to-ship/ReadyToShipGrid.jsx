"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useCustomerSession } from "../hooks/useCustomerSession";
import { useShopLocale } from "../hooks/useShopLocale";
import { BAG_CHANGE_EVENT, createBagItem, getBagIdForProduct, readBag, updateBag } from "../lib/bag-store";
import { formatProductPrice } from "../lib/collections";
import { fill } from "../lib/i18n";
import { isOptimizableImageSrc } from "../lib/image-source";
import {
  formatPublicProductCode,
  getPublicProductAltText,
  getPublicProductDisplayName,
  getPublicProductPath
} from "../lib/product-display";
import { shopEn } from "../lib/ui-text-shop";
import CatalogueEmptyLinks from "../components/CatalogueEmptyLinks";
import styles from "./ready-to-ship.module.css";

const FALLBACK_IMAGE = "/assets/images/logo.png";
// The first row is the only part that can sit in the opening viewport.
const ABOVE_FOLD_COUNT = 4;

function getDiscountPercent(product) {
  const now = Number(product.basePrice);
  const was = Number(product.compareAtPrice);

  if (!Number.isFinite(now) || !Number.isFinite(was) || was <= now || now <= 0) {
    return 0;
  }

  return Math.round(((was - now) / was) * 100);
}

export default function ReadyToShipGrid({ products, loadFailed = false }) {
  const { locale, t, href: localHref } = useShopLocale();
  const copy = t.readyToShip;
  const { customer } = useCustomerSession();
  const [bagIds, setBagIds] = useState([]);

  // The bag lives in the browser, so it is read after mount and re-read when it changes elsewhere.
  useEffect(() => {
    const sync = () => setBagIds(readBag().map((item) => item.id));
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(BAG_CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(BAG_CHANGE_EVENT, sync);
    };
  }, []);

  function toggleBag(product) {
    const id = getBagIdForProduct(product);

    // The bag and order flow read base_price, which is the price after discount.
    // The collection is stored in English so it reads the same in either language.
    updateBag((bag) => (
      bag.some((item) => item.id === id)
        ? bag.filter((item) => item.id !== id)
        : [createBagItem(product, shopEn.readyToShip.title), ...bag]
    ), { customerId: customer?.id || "" });
  }

  if (!products.length) {
    return (
      <div className={styles.empty}>
        <p>{loadFailed ? copy.unavailable : copy.empty}</p>
        <CatalogueEmptyLinks
          links={[
            { href: "/collections", label: t.catalogue.emptyLinks.collections },
            { href: "/category/engagement-ring", label: t.catalogue.emptyLinks.engagementRings },
            { href: "/contact-us", label: t.catalogue.emptyLinks.contact }
          ]}
        />
      </div>
    );
  }

  return (
    <section className={styles.section} aria-label={copy.productsLabel}>
      <p className={styles.meta}>
        <span>{fill(copy.count, { count: products.length })}</span>
        <span>{copy.note}</span>
      </p>
      <ul className={styles.grid}>
        {products.map((product, index) => {
          const code = formatPublicProductCode(product.sku);
          const name = getPublicProductDisplayName(product, t.bag.kinds);
          const image = String(product.primaryImageUrl || product.coverImageUrl || "").trim() || FALLBACK_IMAGE;
          const percent = getDiscountPercent(product);
          const inBag = bagIds.includes(getBagIdForProduct(product));

          return (
            <li key={product.id || product.sku} className={styles.card}>
              <Link
                className={styles.imageLink}
                href={localHref(getPublicProductPath(product))}
                aria-label={fill(copy.view, { code: product.sku })}
              >
                <Image
                  className={styles.image}
                  src={image}
                  alt={getPublicProductAltText(product, t.bag.kinds)}
                  width={1024}
                  height={1024}
                  sizes="(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 25vw"
                  loading={index < ABOVE_FOLD_COUNT ? "eager" : "lazy"}
                  unoptimized={!isOptimizableImageSrc(image)}
                />
                {percent ? <span className={styles.badge}>{fill(copy.off, { percent })}</span> : null}
              </Link>
              <div className={styles.info}>
                <h2 className={styles.code}>{code}</h2>
                <p className={styles.name}>{name}</p>
                <p className={styles.price}>
                  <span className="sr-only">{copy.nowLabel}: </span>
                  <strong className={styles.now}>{formatProductPrice(product.basePrice, locale)}</strong>
                  {percent ? (
                    <>
                      <span className="sr-only"> {copy.wasLabel}: </span>
                      <del className={styles.was}>{formatProductPrice(product.compareAtPrice, locale)}</del>
                    </>
                  ) : null}
                </p>
              </div>
              <button
                type="button"
                className={`${styles.action}${inBag ? ` ${styles.added}` : ""}`}
                aria-pressed={inBag}
                aria-label={fill(inBag ? t.product.removeLabel : t.product.addLabel, { code: product.sku })}
                onClick={() => toggleBag(product)}
              >
                {inBag ? t.product.addedToBag : t.product.addToBag}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
