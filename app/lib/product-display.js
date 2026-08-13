const THAI_TEXT_PATTERN = /[\u0E00-\u0E7F]/;

export function hasThaiText(value) {
  return THAI_TEXT_PATTERN.test(String(value || ""));
}

export function getPublicProductDisplayName(product = {}) {
  const sku = String(product.sku || "").toUpperCase();
  const searchText = [
    product.category,
    product.collection,
    product.slug,
    !hasThaiText(product.name) ? product.name : ""
  ].filter(Boolean).join(" ").toLowerCase();

  if (sku.startsWith("SE") || searchText.includes("earring")) {
    return "Diamond Earrings";
  }

  if (
    sku.startsWith("WB")
    || sku.startsWith("MB")
    || sku.startsWith("MR")
    || sku.startsWith("MWB")
    || searchText.includes("wedding-band")
    || searchText.includes("wedding band")
  ) {
    return "Wedding Band";
  }

  if (sku.startsWith("SR") || searchText.includes("ring")) {
    return "Diamond Ring";
  }

  if (sku.startsWith("SN") || sku.startsWith("SP") || searchText.includes("necklace") || searchText.includes("pendant")) {
    return "Diamond Pendant";
  }

  if (sku.startsWith("SB") || searchText.includes("bracelet")) {
    return "Diamond Bracelet";
  }

  return "Fine Jewelry Piece";
}

// Catalogue codes are entered by hand and most follow "SR 0101 ER", but a few
// arrive unspaced ("SR0033WS"). Normalising for display only keeps a product
// grid from looking untidy without rewriting the stored SKU.
const PRODUCT_CODE_PATTERN = /^([A-Z]{2,3})\s*(\d{3,4})\s*([A-Z]{0,3})$/;

export function formatPublicProductCode(sku) {
  const value = String(sku || "").trim().toUpperCase();
  const match = value.match(PRODUCT_CODE_PATTERN);

  if (!match) {
    return value;
  }

  const [, prefix, digits, suffix] = match;
  return [prefix, digits, suffix].filter(Boolean).join(" ");
}

export function getPublicProductAltText(product = {}) {
  return `${product.sku || "Maris"} ${getPublicProductDisplayName(product)}`;
}

export function getPublicVariantDisplayName(variant = {}) {
  if (variant.variantName && !hasThaiText(variant.variantName)) {
    return variant.variantName;
  }

  const details = [
    variant.material,
    variant.size ? `Size ${variant.size}` : ""
  ].filter(Boolean);

  return details.length ? details.join(", ") : variant.sku || "Selected option";
}

export function getPublicImageAltText(image = {}, productCode, productName, index = 0) {
  if (image.altText && !hasThaiText(image.altText)) {
    return image.altText;
  }

  return `${productCode || "Maris"} ${productName || "Fine Jewelry Piece"} view ${index + 1}`;
}
