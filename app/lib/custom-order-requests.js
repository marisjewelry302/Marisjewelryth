import { createHash } from "node:crypto";

import { normalizeMarketingEmail } from "./customer-email.js";
import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./maris-database.js";

export const GOLD_METALS = Object.freeze(new Set(["WG", "YG", "RG"]));
export const METALS = Object.freeze(new Set(["WG", "YG", "RG", "PN", "Pd"]));
export const METAL_LABELS = Object.freeze({
  WG: "White Gold",
  YG: "Yellow Gold",
  RG: "Rose Gold",
  PN: "Platinum",
  Pd: "Palladium"
});
export const METAL_PURITIES = Object.freeze(new Set(["9K", "14K", "18K"]));
export const STONE_COLORS = Object.freeze(new Set([
  "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N",
  "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
]));
export const STONE_CLARITIES = Object.freeze(new Set([
  "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1", "I2", "I3"
]));
export const STONE_CUTS = Object.freeze(new Set(["Excellent", "Very Good", "Good", "Fair", "Poor"]));
export const ORIGINS = Object.freeze(new Set(["Lab-grown", "Natural"]));

const CUSTOMER_COLUMNS = `
  id,
  full_name,
  email,
  phone,
  metadata,
  created_at,
  updated_at
`;

function cleanText(value) {
  const text = String(value || "").trim();
  return text || "";
}

function cleanProductCode(value) {
  return cleanText(value).toUpperCase();
}

function cleanOptionalText(value) {
  const text = cleanText(value);
  return text || null;
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getCustomOptions(payload) {
  return payload?.custom_options && typeof payload.custom_options === "object"
    ? payload.custom_options
    : {};
}

function getStoneOptions(customOptions) {
  return customOptions.choose_stone && typeof customOptions.choose_stone === "object"
    ? customOptions.choose_stone
    : {};
}

function getPhoneDigits(contactNumber) {
  return String(contactNumber || "").replace(/\D/g, "");
}

function isHalfStep(value) {
  return Number.isInteger(Number(value) * 2);
}

function normalizeCustomer(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    fullName: row.full_name || "",
    email: row.email || "",
    phone: row.phone || "",
    metadata: row.metadata || {},
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

function buildLeadMetadata(order, now) {
  const timestamp = typeof now === "function" ? now().toISOString() : new Date().toISOString();

  return {
    lead_source: "custom_order_request",
    last_custom_order_product_code: order.productCode,
    last_custom_order_at: timestamp
  };
}

export function normalizeCustomOrderPayload(payload = {}) {
  const customOptions = getCustomOptions(payload);
  const stoneOptions = getStoneOptions(customOptions);
  const metal = cleanOptionalText(customOptions.metal);
  const metalPurity = GOLD_METALS.has(metal) ? cleanOptionalText(customOptions.metal_purity) : null;
  const contactNumber = cleanText(payload.contact_number);

  return {
    productCode: cleanProductCode(payload.product_code),
    fullName: cleanText(payload.full_name),
    companyName: cleanText(payload.company_name),
    email: normalizeMarketingEmail(payload.email),
    contactNumber,
    phoneDigits: getPhoneDigits(contactNumber),
    metal,
    metalPurity,
    ringSize: parseOptionalNumber(customOptions.ring_size),
    stoneCarat: parseOptionalNumber(stoneOptions.carat ?? customOptions.stone_carat),
    stoneColor: cleanOptionalText(stoneOptions.color ?? customOptions.stone_color),
    stoneClarity: cleanOptionalText(stoneOptions.clarity ?? customOptions.stone_clarity),
    stoneCut: cleanOptionalText(stoneOptions.cut ?? customOptions.stone_cut),
    origin: cleanOptionalText(customOptions.origin),
    honeypot: cleanText(payload.website_url)
  };
}

export function validateCustomOrderPayload(payload = {}) {
  const normalized = normalizeCustomOrderPayload(payload);
  const errors = [];
  const addError = (field, message) => {
    errors.push({ field, message });
  };

  if (!normalized.productCode) {
    addError("product_code", "Product code is required.");
  }

  if (!normalized.fullName) {
    addError("full_name", "Full name is required.");
  }

  if (!normalized.email) {
    addError("email", "A valid email is required.");
  }

  if (!normalized.contactNumber) {
    addError("contact_number", "Contact number is required.");
  } else if (!/^[\d\s+()-]+$/.test(normalized.contactNumber)) {
    addError("contact_number", "Contact number contains unsupported characters.");
  } else if (normalized.phoneDigits.length < 9 || normalized.phoneDigits.length > 15) {
    addError("contact_number", "Contact number must contain 9 to 15 digits.");
  }

  if (normalized.metal && !METALS.has(normalized.metal)) {
    addError("metal", "Metal is not supported.");
  }

  if (normalized.metalPurity && !METAL_PURITIES.has(normalized.metalPurity)) {
    addError("metal_purity", "Metal purity is not supported.");
  }

  if (
    normalized.ringSize !== null
    && (normalized.ringSize < 5 || normalized.ringSize > 16 || !isHalfStep(normalized.ringSize))
  ) {
    addError("ring_size", "Ring size must be from 5 to 16 in half-size steps.");
  }

  if (normalized.stoneCarat !== null && (normalized.stoneCarat < 0.2 || normalized.stoneCarat > 5)) {
    addError("stone_carat", "Stone carat must be from 0.2 to 5.");
  }

  if (normalized.stoneColor && !STONE_COLORS.has(normalized.stoneColor)) {
    addError("stone_color", "Stone color is not supported.");
  }

  if (normalized.stoneClarity && !STONE_CLARITIES.has(normalized.stoneClarity)) {
    addError("stone_clarity", "Stone clarity is not supported.");
  }

  if (normalized.stoneCut && !STONE_CUTS.has(normalized.stoneCut)) {
    addError("stone_cut", "Stone cut is not supported.");
  }

  if (normalized.origin && !ORIGINS.has(normalized.origin)) {
    addError("origin", "Origin is not supported.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalized
  };
}

export function buildCustomOrderSummary(order) {
  const metalLabel = order.metal ? METAL_LABELS[order.metal] || order.metal : "";
  const metalText = [order.metalPurity, metalLabel].filter(Boolean).join(" ");
  const stoneText = [
    order.stoneCarat === null || order.stoneCarat === undefined ? "" : `${order.stoneCarat} ct`,
    order.stoneColor,
    order.stoneClarity,
    order.stoneCut
  ].filter(Boolean).join(" ");

  return [
    metalText,
    order.ringSize === null || order.ringSize === undefined ? "" : `Size ${order.ringSize}`,
    order.origin,
    stoneText
  ].filter(Boolean).join(" · ");
}

export function buildRequestFingerprint(order) {
  const fingerprintPayload = {
    productCode: order.productCode,
    email: order.email,
    contactNumber: order.contactNumber,
    metal: order.metal,
    metalPurity: order.metalPurity,
    ringSize: order.ringSize,
    stoneCarat: order.stoneCarat,
    stoneColor: order.stoneColor,
    stoneClarity: order.stoneClarity,
    stoneCut: order.stoneCut,
    origin: order.origin
  };

  return createHash("sha256").update(JSON.stringify(fingerprintPayload)).digest("hex");
}

export function getCustomOrderClient({ env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return {
      config,
      client: null
    };
  }

  return {
    config,
    client: client || createSupabaseAdminClient(env)
  };
}

export async function findOrCreateCustomOrderCustomer(order, { env = process.env, client, now } = {}) {
  const { config, client: supabase } = getCustomOrderClient({ env, client });

  if (!config.isConfigured) {
    return {
      status: "not_configured",
      missingEnv: config.missingEnv,
      customer: null
    };
  }

  const normalizedOrder = order?.productCode ? order : normalizeCustomOrderPayload(order);
  const email = normalizeMarketingEmail(normalizedOrder.email);
  const leadMetadata = buildLeadMetadata(normalizedOrder, now);

  let existing = null;

  if (email) {
    const { data, error } = await supabase
      .from("customers")
      .select(CUSTOMER_COLUMNS)
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "Customer could not be loaded by email.");
    }

    existing = data || null;
  }

  if (!existing && normalizedOrder.contactNumber) {
    const { data, error } = await supabase
      .from("customers")
      .select(CUSTOMER_COLUMNS)
      .eq("phone", normalizedOrder.contactNumber)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "Customer could not be loaded by phone.");
    }

    existing = data || null;
  }

  if (existing) {
    const payload = {
      full_name: normalizedOrder.fullName,
      phone: normalizedOrder.contactNumber,
      metadata: {
        ...(existing.metadata || {}),
        ...leadMetadata
      },
      updated_at: leadMetadata.last_custom_order_at
    };

    const { data, error } = await supabase
      .from("customers")
      .update(payload)
      .eq("id", existing.id)
      .select(CUSTOMER_COLUMNS)
      .single();

    if (error) {
      throw new Error(error.message || "Customer lead could not be updated.");
    }

    return {
      status: "updated",
      customer: normalizeCustomer(data)
    };
  }

  const insertPayload = {
    full_name: normalizedOrder.fullName,
    email,
    phone: normalizedOrder.contactNumber,
    metadata: leadMetadata
  };

  const { data, error } = await supabase
    .from("customers")
    .insert(insertPayload)
    .select(CUSTOMER_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message || "Customer lead could not be created.");
  }

  return {
    status: "created",
    customer: normalizeCustomer(data)
  };
}
