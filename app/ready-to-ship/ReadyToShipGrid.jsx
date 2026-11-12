"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useShopLocale } from "../hooks/useShopLocale";
import { formatProductPrice } from "../lib/collections";
import { fill } from "../lib/i18n";
import { isOptimizableImageSrc } from "../lib/image-source";
import {
  formatPublicProductCode,
  getPublicProductAltText,
  getPublicProductDisplayName,
  getPublicProductPath
} from "../lib/product-display";
import styles from "./ready-to-ship.module.css";

const BAG_KEY = "marisShoppingBag";
const FALLBACK_IMAGE = "/assets/images/logo.png";
// The first row is the only part that can sit in the opening viewport.
const ABOVE_FOLD_COUNT = 4;

function readBag() {
  try {
    const value = JSON.parse(localStorage.getItem(BAG_KEY));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    return [];
  }
}

function writeBag(items) {
  try {
    localStorage.setItem(BAG_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("maris:bagchange"));
    return true;
  } catch (error) {
    return false;
  }
}

// Same id the product page uses, so a piece added here shows as added there too.
function getBagId(product) {
  return `${product.collection}:${product.sku}`;
}

function getDiscountPercent(product) {
  const now = Number(product.basePrice);
  const was = Number(product.compareAtPrice);

  if (!Number.isFinite(now) || !Number.isFinite(was) || was <= now || now <= 0) {
    return 0;
  }

  return Math.round(((was - now) / was) * 100);
}

export default function ReadyToShipGrid({ products }) {
  const { locale, t, href: localHref } = useShopLocale();
  const copy = t.readyToShip;
  const [bagIds, setBagIds] = useState([]);

  // The bag lives in the browser, so it is read after mount and re-read when it changes elsewhere.
  useEffect(() => {
    const sync = () => setBagIds(readBag().map((item) => item.id));
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("maris:bagchange", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("maris:bagchange", sync);
    };
  }, []);

  function toggleBag(product) {
    const id = getBagId(product);
    const bag = readBag();

    if (bag.some((item) => item.id === id)) {
      writeBag(bag.filter((item) => item.id !== id));
      return;
    }

    writeBag([
      {
        id,
        title: product.sku,
        details: [getPublicProductDisplayName(product)],
        image: product.primaryImageUrl,
        href: getPublicProductPath(product),
        collection: copy.title,
        // The bag and order flow read base_price, which is the price after discount.
        priceLabel: product.basePrice === null ? "Price on request" : `${Number(product.basePrice).toLocaleString()} THB`,
        quantity: 1,
        addedAt: new Date().toISOString()
      },
      ...bag
    ]);
  }

  if (!products.length) {
    return <p className={styles.empty}>{copy.empty}</p>;
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
          const name = getPublicProductDisplayName(product);
          const image = String(product.primaryImageUrl || product.coverImageUrl || "").trim() || FALLBACK_IMAGE;
          const percent = getDiscountPercent(product);
          const inBag = bagIds.includes(getBagId(product));

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
                  alt={getPublicProductAltText(product)}
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
