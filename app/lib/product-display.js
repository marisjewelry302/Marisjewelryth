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
