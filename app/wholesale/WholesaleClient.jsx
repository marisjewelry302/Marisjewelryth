"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useShopLocale } from "../hooks/useShopLocale";
import { fill } from "../lib/i18n";
import { isOptimizableImageSrc } from "../lib/image-source";
import { getPublicProductPath } from "../lib/product-display.js";
import { wholesaleEn, wholesaleTh } from "../lib/ui-text-wholesale";
import {
  WHOLESALE_BUSINESS_TYPES,
  WHOLESALE_CATEGORIES,
  computeWholesaleUnitPrice,
  snapWholesaleQuantity,
  sortPriceBreaks,
  summarizeWholesaleCart,
  validateWholesaleQuantity
} from "../lib/wholesale";
import styles from "./wholesale.module.css";

const LINE_URL = "https://lin.ee/tFg8osD";
const FACEBOOK_URL = "https://www.facebook.com/share/1JH2idcjPM/";
const INSTAGRAM_URL = "https://www.instagram.com/maris_jewelry_th?igsh=MXNoeHpxN2VkaTU0NA==";
const CART_KEY = "marisWholesaleCart";
const FALLBACK_IMAGE = "/assets/images/logo.png";

// The PO draft lives in this browser only; the server re-prices it on submit.
function readCart() {
  try {
    const value = JSON.parse(window.localStorage.getItem(CART_KEY));
    return Array.isArray(value)
      ? value.filter((line) => line && typeof line.productId === "string" && Number.isInteger(line.quantity))
      : [];
  } catch {
    return [];
  }
}

function writeCart(lines) {
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
  } catch {
    // Private mode or full storage: the PO still works for this visit.
  }
}

function newIdempotencyKey() {
  try {
    return window.crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: options.body ? { "Content-Type": "application/json", ...(options.headers || {}) } : options.headers
  });
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

export default function WholesaleClient() {
  const { locale, href } = useShopLocale();
  const w = locale === "th" ? wholesaleTh : wholesaleEn;
  const numberFormat = useMemo(
    () => new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [locale]
  );
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { dateStyle: "medium" }),
    [locale]
  );
  const money = useCallback(
    (value) => (value === null || value === undefined ? w.catalogue.priceOnRequest : `${numberFormat.format(value)} ${w.currency}`),
    [numberFormat, w]
  );
  const formatDate = useCallback((value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : dateFormat.format(date);
  }, [dateFormat]);

  const [phase, setPhase] = useState("loading"); // loading | signed_out | unavailable | ready
  const [customer, setCustomer] = useState(null);
  const [account, setAccount] = useState(null);
  const [editing, setEditing] = useState(false);

  const loadAccount = useCallback(async () => {
    const { ok, status, payload } = await requestJson("/api/wholesale/account");
    if (status === 401) {
      setPhase("signed_out");
      return;
    }
    if (!ok) {
      setPhase("unavailable");
      return;
    }
    setCustomer(payload.customer || null);
    setAccount(payload.account || null);
    setPhase("ready");
  }, []);

  useEffect(() => {
    // Loading the account is syncing with the server, which is what effects are for.
    loadAccount();
  }, [loadAccount]);

  const signInHref = `${href("/account")}?next=${encodeURIComponent(href("/wholesale"))}`;

  return (
    <main id="main-content" className={`site-main ${styles.page}`}>
      <section className={styles.hero}>
        <p className={styles.kicker}>{w.eyebrow}</p>
        <h1>{w.title}</h1>
        <p className={styles.lead}>{w.lead}</p>
      </section>

      {phase !== "loading" && account?.status !== "approved" && (
        <section className={styles.shell}>
          <div className={styles.card}>
            <h2>{w.inquiry.title}</h2>
            <p>{w.inquiry.text}</p>
            <div className={styles.actions}>
              <a className={styles.button} href={`${href("/contact-us")}?service=${encodeURIComponent("Wholesale & Retail")}`}>{w.inquiry.action}</a>
              <span>{w.inquiry.emailLabel}: <a className={styles.textLink} href={`mailto:${w.inquiry.email}`}>{w.inquiry.email}</a></span>
            </div>
            <p className={styles.channels}>
              <span>{w.inquiry.channelsLabel}</span>
              <a className={styles.textLink} href={LINE_URL} target="_blank" rel="noopener noreferrer">LINE</a>
              <a className={styles.textLink} href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">Facebook</a>
              <a className={styles.textLink} href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram</a>
            </p>
            <p className={styles.muted}>{w.inquiry.portalNote}</p>
          </div>
        </section>
      )}

      {phase !== "loading" && account?.status !== "approved" && (
        <section className={styles.shell} aria-labelledby="wholesale-highlights">
          <h2 id="wholesale-highlights" className={styles.sectionTitle}>{w.highlights.title}</h2>
          <div className={styles.highlightGrid}>
            {w.highlights.items.map((item) => (
              <article key={item.title} className={styles.highlight}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className={styles.shell}>
        {phase === "loading" && <p className={styles.muted} role="status">{w.loading}</p>}

        {phase === "unavailable" && <p className={styles.notice} role="alert">{w.unavailable}</p>}

        {phase === "signed_out" && (
          <div className={styles.card}>
            <h2>{w.signedOut.title}</h2>
            <p>{w.signedOut.text}</p>
            <div className={styles.actions}>
              <a className={styles.button} href={signInHref}>{w.signedOut.action}</a>
              <a className={styles.textLink} href={href("/wholesale-retail")}>{w.signedOut.learnMore}</a>
            </div>
          </div>
        )}

        {phase === "ready" && (!account || editing) && (
          <ApplicationForm
            w={w}
            account={account}
            customer={customer}
            onCancel={account ? () => setEditing(false) : null}
            onSaved={(saved) => {
              setAccount(saved);
              setEditing(false);
            }}
          />
        )}

        {phase === "ready" && account && !editing && account.status !== "approved" && (
          <div className={styles.card} role="status">
            <h2>{w.status[account.status]?.title}</h2>
            <p>{fill(w.status[account.status]?.text || "", { company: account.companyName })}</p>
            <div className={styles.actions}>
              {["pending", "rejected"].includes(account.status) && (
                <button className={styles.button} type="button" onClick={() => setEditing(true)}>{w.status.edit}</button>
              )}
              <a className={styles.textLink} href={href("/contact-us")}>{w.status.contact}</a>
            </div>
          </div>
        )}

        {phase === "ready" && account?.status === "approved" && !editing && (
          <WholesaleWorkspace w={w} account={account} money={money} formatDate={formatDate} href={href} />
        )}
      </section>
    </main>
  );
}

// ─── Application ───────────────────────────────────────────────────────────

function ApplicationForm({ w, account, customer, onCancel, onSaved }) {
  const f = w.form;
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(
      ["companyName", "businessType", "taxId", "businessAddress", "country", "website", "contactName",
        "contactPhone", "lineId", "expectedMonthlyVolume", "applicantNote"].map((key) => [key, String(form.get(key) || "")])
    );
    body.interestedCategories = form.getAll("interestedCategories").map(String);

    setSubmitting(true);
    setMessage("");
    setErrors([]);
    const { ok, payload } = await requestJson("/api/wholesale/account", { method: "POST", body: JSON.stringify(body) });
    setSubmitting(false);

    if (!ok) {
      setErrors(Array.isArray(payload.errors) ? payload.errors : []);
      setMessage(payload.errors ? f.invalid : payload.error || w.genericError);
      return;
    }

    onSaved(payload.account);
  }

  const invalid = (name) => errors.includes(name);
  const field = (name, label, input) => (
    <label className={`${styles.field} ${invalid(name) ? styles.fieldInvalid : ""}`}>
      <span>{label}</span>
      {input}
    </label>
  );
  const defaults = account || {};

  return (
    <form className={styles.card} onSubmit={handleSubmit} noValidate>
      <h2>{f.title}</h2>
      <p className={styles.muted}>{f.intro}</p>

      <div className={styles.formGrid}>
        {field("companyName", f.companyName,
          <input name="companyName" required minLength={2} maxLength={160} defaultValue={defaults.companyName} aria-invalid={invalid("companyName")} />)}
        {field("businessType", f.businessType,
          <select name="businessType" defaultValue={defaults.businessType || "retailer"} aria-invalid={invalid("businessType")}>
            {WHOLESALE_BUSINESS_TYPES.map((type) => <option key={type} value={type}>{w.businessTypes[type]}</option>)}
          </select>)}
        {field("contactName", f.contactName,
          <input name="contactName" required maxLength={120} autoComplete="name" defaultValue={defaults.contactName || customer?.fullName} aria-invalid={invalid("contactName")} />)}
        {field("contactPhone", f.contactPhone,
          <input name="contactPhone" type="tel" required maxLength={40} autoComplete="tel" defaultValue={defaults.contactPhone || customer?.phone} aria-invalid={invalid("contactPhone")} />)}
        {field("lineId", f.lineId, <input name="lineId" maxLength={60} defaultValue={defaults.lineId} />)}
        {field("taxId", f.taxId, <input name="taxId" maxLength={40} defaultValue={defaults.taxId} />)}
        {field("country", f.country, <input name="country" maxLength={80} autoComplete="country-name" defaultValue={defaults.country || "Thailand"} />)}
        {field("website", f.website,
          <input name="website" type="url" maxLength={200} placeholder="https://" defaultValue={defaults.website} aria-invalid={invalid("website")} />)}
        <div className={styles.span2}>
          {field("businessAddress", f.businessAddress,
            <textarea name="businessAddress" rows={3} required maxLength={600} autoComplete="street-address" defaultValue={defaults.businessAddress} aria-invalid={invalid("businessAddress")} />)}
        </div>
        <div className={styles.span2}>
          {field("expectedMonthlyVolume", f.expectedMonthlyVolume,
            <input name="expectedMonthlyVolume" maxLength={120} placeholder={f.expectedMonthlyVolumeHint} defaultValue={defaults.expectedMonthlyVolume} />)}
        </div>
        <fieldset className={`${styles.span2} ${styles.checkGroup}`}>
          <legend>{f.interestedCategories}</legend>
          {WHOLESALE_CATEGORIES.map((category) => (
            <label key={category}>
              <input type="checkbox" name="interestedCategories" value={category}
                defaultChecked={(defaults.interestedCategories || []).includes(category)} />
              {w.categories[category]}
            </label>
          ))}
        </fieldset>
        <div className={styles.span2}>
          {field("applicantNote", f.applicantNote,
            <textarea name="applicantNote" rows={3} maxLength={2000} defaultValue={defaults.applicantNote} />)}
        </div>
      </div>

      {message && <p className={styles.error} role="alert">{message}</p>}

      <div className={styles.actions}>
        <button className={styles.button} type="submit" disabled={submitting}>
          {submitting ? f.submitting : account ? f.resubmit : f.submit}
        </button>
        {onCancel && <button className={styles.ghostButton} type="button" onClick={onCancel}>{f.cancelEdit}</button>}
      </div>
    </form>
  );
}

// ─── Approved workspace ────────────────────────────────────────────────────

function WholesaleWorkspace({ w, account, money, formatDate, href }) {
  const [tab, setTab] = useState("catalogue");
  const [catalogue, setCatalogue] = useState({ status: "loading", products: [], discountPercent: account.discountPercent });
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState({ status: "loading", list: [] });
  const [flash, setFlash] = useState("");

  const loadCatalogue = useCallback(async () => {
    const { ok, payload } = await requestJson("/api/wholesale/catalogue");
    setCatalogue(ok
      ? { status: "ready", products: payload.products || [], discountPercent: Number(payload.discountPercent) || 0 }
      : { status: "error", products: [], discountPercent: account.discountPercent });
  }, [account.discountPercent]);

  const loadOrders = useCallback(async () => {
    const { ok, payload } = await requestJson("/api/wholesale/orders");
    setOrders(ok ? { status: "ready", list: payload.orders || [] } : { status: "error", list: [] });
  }, []);

  useEffect(() => {
    // Reads the saved PO draft and the server data once; both are external systems.
    setCart(readCart());
    loadCatalogue();
    loadOrders();
  }, [loadCatalogue, loadOrders]);

  const updateCart = useCallback((updater) => {
    setCart((current) => {
      const next = updater(current).filter((line) => line.quantity > 0);
      writeCart(next);
      return next;
    });
  }, []);

  const productsById = useMemo(
    () => new Map(catalogue.products.map((product) => [product.id, product])),
    [catalogue.products]
  );
  const cartPieces = cart.reduce((total, line) => total + line.quantity, 0);

  const tabs = [
    ["catalogue", w.tabs.catalogue],
    ["cart", `${w.tabs.cart}${cart.length ? ` (${cartPieces})` : ""}`],
    ["orders", w.tabs.orders]
  ];

  return (
    <>
      <div className={styles.termsBar}>
        <div><span>{w.terms.company}</span><strong>{account.companyName}</strong></div>
        <div><span>{w.terms.discount}</span><strong>{Number(catalogue.discountPercent || 0)}%</strong></div>
        <div><span>{w.terms.paymentTerms}</span><strong>{w.paymentTerms[account.paymentTerms] || account.paymentTerms}</strong></div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label={w.tabs.label}>
        {tabs.map(([key, label]) => (
          <button key={key} type="button" role="tab" id={`wholesale-tab-${key}`} aria-controls={`wholesale-panel-${key}`}
            aria-selected={tab === key} className={tab === key ? styles.tabActive : ""} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {flash && <p className={styles.success} role="status">{flash}</p>}

      <div role="tabpanel" id={`wholesale-panel-${tab}`} aria-labelledby={`wholesale-tab-${tab}`}>
        {tab === "catalogue" && (
          <CataloguePanel w={w} catalogue={catalogue} cart={cart} money={money} href={href}
            onAdd={(productId, quantity) => {
              updateCart((current) => {
                const others = current.filter((line) => line.productId !== productId);
                return [...others, { productId, quantity }];
              });
              setFlash(w.catalogue.added);
            }} />
        )}

        {tab === "cart" && (
          <CartPanel w={w} account={account} cart={cart} productsById={productsById} catalogueReady={catalogue.status === "ready"}
            discountPercent={catalogue.discountPercent} money={money}
            onQuantity={(productId, quantity) => updateCart((current) => current.map((line) => (
              line.productId === productId ? { ...line, quantity } : line
            )))}
            onRemove={(productId) => updateCart((current) => current.filter((line) => line.productId !== productId))}
            onSubmitted={(order) => {
              updateCart(() => []);
              setFlash(fill(w.cart.submitted, { number: order.orderNumber }));
              setTab("orders");
              loadOrders();
            }} />
        )}

        {tab === "orders" && (
          <OrdersPanel w={w} orders={orders} money={money} formatDate={formatDate}
            onChanged={(order) => setOrders((current) => ({
              ...current,
              list: current.list.map((entry) => (entry.id === order.id ? order : entry))
            }))} />
        )}
      </div>
    </>
  );
}

function PriceBreakList({ w, product, discountPercent, money }) {
  const breaks = sortPriceBreaks(product.wholesale.priceBreaks);
  const rows = breaks.length
    ? breaks.map((entry) => [fill(w.catalogue.fromQty, { qty: entry.minQuantity }), entry.minQuantity])
    : [[w.catalogue.basePrice, product.wholesale.minimumOrderQuantity]];

  return (
    <dl className={styles.breaks} aria-label={w.catalogue.priceBreaks}>
      {rows.map(([label, qty]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{money(computeWholesaleUnitPrice({ priceBreaks: breaks, basePrice: product.basePrice, quantity: qty, discountPercent }))}</dd>
        </div>
      ))}
    </dl>
  );
}

function CataloguePanel({ w, catalogue, cart, money, href, onAdd }) {
  const c = w.catalogue;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [quantities, setQuantities] = useState({});

  const categories = useMemo(
    () => Array.from(new Set(catalogue.products.map((product) => product.category).filter(Boolean))).sort(),
    [catalogue.products]
  );
  const term = search.trim().toLowerCase();
  const visible = catalogue.products.filter((product) => (
    (category === "all" || product.category === category)
    && (!term || `${product.name} ${product.sku} ${product.collectionName}`.toLowerCase().includes(term))
  ));

  if (catalogue.status === "loading") return <p className={styles.muted} role="status">{w.loading}</p>;
  if (catalogue.status === "error") return <p className={styles.notice} role="alert">{w.unavailable}</p>;
  if (!catalogue.products.length) return <p className={styles.notice}>{c.empty}</p>;

  return (
    <>
      <div className={styles.toolbar}>
        <label className={styles.field}>
          <span>{c.search}</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>{c.category}</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">{c.allCategories}</option>
            {categories.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>

      {catalogue.discountPercent > 0 && <p className={styles.muted}>{fill(c.discountNote, { discount: catalogue.discountPercent })}</p>}
      {!visible.length && <p className={styles.notice}>{c.noMatch}</p>}

      <ul className={styles.productGrid}>
        {visible.map((product) => {
          const terms = product.wholesale;
          const inCart = cart.find((line) => line.productId === product.id);
          const quantity = quantities[product.id] ?? inCart?.quantity ?? terms.minimumOrderQuantity;
          const error = validateWholesaleQuantity({ quantity, minimumOrderQuantity: terms.minimumOrderQuantity, casePack: terms.casePack });
          const unit = computeWholesaleUnitPrice({
            priceBreaks: terms.priceBreaks,
            basePrice: product.basePrice,
            quantity,
            discountPercent: catalogue.discountPercent
          });
          const inputId = `wholesale-qty-${product.id}`;
          const image = product.image || FALLBACK_IMAGE;

          return (
            <li key={product.id} className={styles.product}>
              <a className={styles.productImage} href={href(getPublicProductPath(product))} target="_blank" rel="noopener noreferrer">
                <Image src={image} alt={product.name} width={640} height={640} sizes="(max-width: 700px) 45vw, 260px"
                  unoptimized={!isOptimizableImageSrc(image)} />
              </a>
              <div className={styles.productBody}>
                <p className={styles.sku}>{product.sku}</p>
                <h3>{product.name}</h3>
                <p className={styles.meta}>
                  {fill(c.moq, { qty: terms.minimumOrderQuantity })}
                  {terms.casePack > 1 && <> · {fill(c.casePack, { qty: terms.casePack })}</>}
                  {terms.leadTimeDays !== null && <> · {fill(c.leadTime, { days: terms.leadTimeDays })}</>}
                </p>
                {terms.note && <p className={styles.meta}>{terms.note}</p>}
                <PriceBreakList w={w} product={product} discountPercent={catalogue.discountPercent} money={money} />
                <div className={styles.addRow}>
                  <label htmlFor={inputId}>{c.quantity}</label>
                  <input id={inputId} type="number" inputMode="numeric" min={terms.minimumOrderQuantity} step={terms.casePack}
                    value={quantity} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : undefined}
                    onChange={(event) => setQuantities((current) => ({ ...current, [product.id]: event.target.value === "" ? "" : Number(event.target.value) }))}
                    onBlur={() => setQuantities((current) => ({
                      ...current,
                      [product.id]: snapWholesaleQuantity({ quantity, minimumOrderQuantity: terms.minimumOrderQuantity, casePack: terms.casePack })
                    }))} />
                  <button className={styles.button} type="button" disabled={Boolean(error)} onClick={() => onAdd(product.id, Number(quantity))}>
                    {inCart ? c.update : c.add}
                  </button>
                </div>
                {error && (
                  <p id={`${inputId}-error`} className={styles.fieldError}>
                    {fill(w.cart.errors[error], { qty: error === "case_pack" ? terms.casePack : terms.minimumOrderQuantity })}
                  </p>
                )}
                {!error && <p className={styles.meta}>{money(unit)}{unit !== null && ` × ${quantity}`}</p>}
                {inCart && <p className={styles.badge}>{fill(c.inCart, { qty: inCart.quantity })}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function CartPanel({ w, account, cart, productsById, catalogueReady, discountPercent, money, onQuantity, onRemove, onSubmitted }) {
  const t = w.cart;
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");

  useEffect(() => {
    // A fresh key per draft makes a double click or a retry submit the PO once.
    setIdempotencyKey(newIdempotencyKey());
  }, []);

  const lines = cart.map((line) => {
    const product = productsById.get(line.productId);
    if (!product) return { ...line, product: null, error: "unavailable", unitPrice: null };
    const terms = product.wholesale;
    const error = validateWholesaleQuantity({ quantity: line.quantity, minimumOrderQuantity: terms.minimumOrderQuantity, casePack: terms.casePack });
    const unitPrice = computeWholesaleUnitPrice({ priceBreaks: terms.priceBreaks, basePrice: product.basePrice, quantity: line.quantity, discountPercent });
    return { ...line, product, error, unitPrice };
  });
  const summary = summarizeWholesaleCart(lines.filter((line) => line.product));
  const hasErrors = lines.some((line) => line.error);

  if (!cart.length) return <p className={styles.notice}>{t.empty}</p>;

  async function handleSubmit(event) {
    event.preventDefault();
    if (hasErrors) {
      setMessage(t.fixErrors);
      return;
    }

    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setMessage("");
    const { ok, payload } = await requestJson("/api/wholesale/orders", {
      method: "POST",
      body: JSON.stringify({
        items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        shippingAddress: String(form.get("shippingAddress") || ""),
        customerReference: String(form.get("customerReference") || ""),
        requestedShipDate: String(form.get("requestedShipDate") || ""),
        customerNote: String(form.get("customerNote") || ""),
        idempotencyKey
      })
    });
    setSubmitting(false);

    if (!ok) {
      setMessage(payload.error || w.genericError);
      return;
    }

    setIdempotencyKey(newIdempotencyKey());
    onSubmitted(payload.order);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">{t.item}</th>
              <th scope="col">{w.catalogue.quantity}</th>
              <th scope="col">{t.unitPrice}</th>
              <th scope="col">{t.lineTotal}</th>
              <th scope="col"><span className={styles.srOnly}>{t.remove}</span></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const terms = line.product?.wholesale;
              const inputId = `wholesale-cart-${line.productId}`;
              return (
                <tr key={line.productId} className={line.error ? styles.rowInvalid : ""}>
                  <td>
                    <strong>{line.product?.name || line.productId.slice(0, 8)}</strong>
                    <span className={styles.sku}>{line.product?.sku}</span>
                    {line.error === "unavailable" && catalogueReady && <span className={styles.fieldError}>{t.unavailable}</span>}
                    {line.error && line.error !== "unavailable" && (
                      <span id={`${inputId}-error`} className={styles.fieldError}>
                        {fill(t.errors[line.error], { qty: line.error === "case_pack" ? terms.casePack : terms.minimumOrderQuantity })}
                      </span>
                    )}
                  </td>
                  <td>
                    <label className={styles.srOnly} htmlFor={inputId}>{w.catalogue.quantity}</label>
                    <input id={inputId} className={styles.qtyInput} type="number" inputMode="numeric"
                      min={terms?.minimumOrderQuantity || 1} step={terms?.casePack || 1} value={line.quantity}
                      disabled={!line.product} aria-invalid={Boolean(line.error)}
                      aria-describedby={line.error && line.error !== "unavailable" ? `${inputId}-error` : undefined}
                      onChange={(event) => onQuantity(line.productId, Math.max(Number(event.target.value) || 0, 0) || line.quantity)} />
                  </td>
                  <td>{line.product ? money(line.unitPrice) : "—"}</td>
                  <td>{line.product && line.unitPrice !== null ? money(line.unitPrice * line.quantity) : "—"}</td>
                  <td>
                    <button className={styles.linkButton} type="button" onClick={() => onRemove(line.productId)}>{t.remove}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.cartFooter}>
        <div className={styles.formGrid}>
          <div className={styles.span2}>
            <label className={styles.field}>
              <span>{t.shippingAddress}</span>
              <textarea name="shippingAddress" rows={3} required maxLength={600} defaultValue={account.businessAddress} />
            </label>
          </div>
          <label className={styles.field}>
            <span>{t.customerReference}</span>
            <input name="customerReference" maxLength={80} />
          </label>
          <label className={styles.field}>
            <span>{t.requestedShipDate}</span>
            <input name="requestedShipDate" type="date" />
          </label>
          <div className={styles.span2}>
            <label className={styles.field}>
              <span>{t.customerNote}</span>
              <textarea name="customerNote" rows={3} maxLength={2000} />
            </label>
          </div>
        </div>

        <aside className={styles.summary} aria-live="polite">
          <div><span>{t.pieces}</span><strong>{summary.pieces}</strong></div>
          <div><span>{t.subtotal}</span><strong>{money(summary.subtotal)}</strong></div>
          {summary.unpricedLines > 0 && <p className={styles.meta}>{fill(t.unpricedNote, { count: summary.unpricedLines })}</p>}
          <p className={styles.meta}>{t.finalNote}</p>
          {message && <p className={styles.error} role="alert">{message}</p>}
          <button className={styles.button} type="submit" disabled={submitting || !idempotencyKey}>
            {submitting ? t.submitting : t.submit}
          </button>
        </aside>
      </div>
    </form>
  );
}

function OrdersPanel({ w, orders, money, formatDate, onChanged }) {
  const o = w.orders;
  const [openId, setOpenId] = useState("");
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  async function act(order, action) {
    if (action === "cancel" && !window.confirm(o.confirmCancel)) return;
    setBusyId(order.id);
    setMessage("");
    const { ok, payload } = await requestJson(`/api/wholesale/orders?id=${encodeURIComponent(order.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ action })
    });
    setBusyId("");
    if (!ok) {
      setMessage(payload.error || w.genericError);
      return;
    }
    onChanged(payload.order);
  }

  if (orders.status === "loading") return <p className={styles.muted} role="status">{w.loading}</p>;
  if (orders.status === "error") return <p className={styles.notice} role="alert">{w.unavailable}</p>;
  if (!orders.list.length) return <p className={styles.notice}>{o.empty}</p>;

  return (
    <>
      {message && <p className={styles.error} role="alert">{message}</p>}
      <ul className={styles.orderList}>
        {orders.list.map((order) => {
          const isOpen = openId === order.id;
          const detailId = `wholesale-order-${order.id}`;
          return (
            <li key={order.id} className={styles.order}>
              <div className={styles.orderHead}>
                <div><span>{o.number}</span><strong>{order.orderNumber}</strong></div>
                <div><span>{o.submitted}</span><strong>{formatDate(order.submittedAt)}</strong></div>
                <div><span>{o.status}</span><strong className={styles.statusPill} data-status={order.status}>{w.orderStatus[order.status]}</strong></div>
                <div><span>{o.total}</span><strong>{order.hasUnpricedItems ? o.pendingPrice : money(order.totalAmount)}</strong></div>
                <button className={styles.ghostButton} type="button" aria-expanded={isOpen} aria-controls={detailId}
                  onClick={() => setOpenId(isOpen ? "" : order.id)}>
                  {isOpen ? o.hide : o.view}
                </button>
              </div>

              {isOpen && (
                <div id={detailId} className={styles.orderDetail}>
                  <dl className={styles.facts}>
                    {order.customerReference && <div><dt>{o.customerReference}</dt><dd>{order.customerReference}</dd></div>}
                    <div><dt>{o.shipTo}</dt><dd className={styles.preLine}>{order.shippingAddress}</dd></div>
                    {order.requestedShipDate && <div><dt>{o.requestedShipDate}</dt><dd>{formatDate(order.requestedShipDate)}</dd></div>}
                    {order.quoteValidUntil && <div><dt>{o.quoteValidUntil}</dt><dd>{formatDate(order.quoteValidUntil)}</dd></div>}
                    {order.trackingNumber && <div><dt>{o.tracking}</dt><dd>{order.trackingNumber}</dd></div>}
                  </dl>

                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th scope="col">{w.cart.item}</th>
                          <th scope="col">{w.catalogue.quantity}</th>
                          <th scope="col">{w.cart.unitPrice}</th>
                          <th scope="col">{w.cart.lineTotal}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item) => (
                          <tr key={item.id}>
                            <td><strong>{item.name}</strong><span className={styles.sku}>{item.sku}</span></td>
                            <td>{item.quantity}</td>
                            <td>{item.unitPrice === null ? o.pendingPrice : money(item.unitPrice)}</td>
                            <td>{item.lineTotal === null ? "—" : money(item.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr><th scope="row" colSpan={3}>{o.subtotal}</th><td>{money(order.subtotalAmount)}</td></tr>
                        {order.discountAmount > 0 && <tr><th scope="row" colSpan={3}>{o.discount}</th><td>−{money(order.discountAmount)}</td></tr>}
                        {order.shippingAmount > 0 && <tr><th scope="row" colSpan={3}>{o.shipping}</th><td>{money(order.shippingAmount)}</td></tr>}
                        <tr><th scope="row" colSpan={3}>{o.totalLabel}</th><td><strong>{order.hasUnpricedItems ? o.pendingPrice : money(order.totalAmount)}</strong></td></tr>
                      </tfoot>
                    </table>
                  </div>

                  {order.history.length > 0 && (
                    <>
                      <h3 className={styles.subhead}>{o.history}</h3>
                      <ol className={styles.timeline}>
                        {order.history.map((entry, index) => (
                          <li key={`${entry.at}-${index}`}>
                            <strong>{w.orderStatus[entry.toStatus] || entry.toStatus}</strong>
                            <span>{formatDate(entry.at)} · {o.actor[entry.actor] || o.actor.atelier}</span>
                            {entry.note && <p>{entry.note}</p>}
                          </li>
                        ))}
                      </ol>
                    </>
                  )}

                  {order.status === "quoted" && <p className={styles.meta}>{o.acceptNote}</p>}
                  <div className={styles.actions}>
                    {order.status === "quoted" && (
                      <button className={styles.button} type="button" disabled={busyId === order.id} onClick={() => act(order, "accept")}>{o.accept}</button>
                    )}
                    {["submitted", "quoted"].includes(order.status) && (
                      <button className={styles.ghostButton} type="button" disabled={busyId === order.id} onClick={() => act(order, "cancel")}>{o.cancel}</button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
