const marisBaseProducts = [];

const marisBaseCollectionMeta = {
  "wedding-set": {
    title: "Wedding set",
    titleTh: "แหวนแต่งงาน",
    href: "/category/wedding-set"
  },
  "engagement-ring": {
    title: "Engagement Rings",
    titleTh: "แหวนหมั้น",
    href: "/category/engagement-ring"
  },
  "wedding-bands": {
    title: "Wedding Bands",
    titleTh: "แหวนแถว",
    href: "/category/wedding-bands"
  },
  "mens-wedding-bands": {
    title: "Men's Wedding Bands",
    titleTh: "แหวนแต่งงานผู้ชาย",
    href: "/category/mens-wedding-bands"
  },
  "necklaces-pendants": {
    title: "Necklaces & Pendants",
    titleTh: "สร้อยคอและจี้",
    href: "/category/necklaces-pendants"
  },
  bracelets: {
    title: "Bracelets",
    titleTh: "สร้อยข้อมือ",
    href: "/category/bracelets"
  },
  earrings: {
    title: "Earrings",
    titleTh: "ต่างหู",
    href: "/category/earrings"
  },
  rings: {
    title: "Rings",
    titleTh: "แหวน",
    href: "/category/rings"
  }
};

const marisBaseCollectionProducts = {};

(() => {
  const publicCatalogueApiUrl = "/api/catalogue/products";
  const marisSheetColumnSchema = [
    { header: "ID", key: "id", aliases: ["sku", "stock_id"] },
    { header: "Collection", key: "collection", aliases: ["category", "page_category"] },
    { header: "Type", key: "type", aliases: ["product_type"] },
    { header: "Center", key: "center", aliases: ["center_stone"] },
    { header: "Malee", key: "malee", aliases: ["side_stones"] },
    { header: "Gold Weight", key: "gold_weight", aliases: ["goldweight"] },
    { header: "code", key: "code", aliases: ["web_code", "site_code", "product_code", "website_code"], required: true },
    { header: "name", key: "name", aliases: ["product_name", "display_name"], required: true },
    { header: "image_url", key: "image_url", aliases: ["image", "main_image", "main_image_url", "cover_image", "cover_image_url", "white_gold", "white_gold_image", "white_gold_image_url"], required: true },
    { header: "top_image_url", key: "top_image_url", aliases: ["top", "top_image", "top_url", "top_view", "top_view_image"] },
    { header: "front_image_url", key: "front_image_url", aliases: ["front", "front_image", "front_url", "front_view", "front_view_image"] },
    { header: "side_image_url", key: "side_image_url", aliases: ["side", "side_image", "side_url", "side_view", "side_view_image"] },
    { header: "yellow_gold_image_url", key: "yellow_gold_image_url", aliases: ["yellow_gold", "yellow_gold_image", "yellow_gold_url", "yellow_gold_view", "yellow_gold_view_image"] },
    { header: "rose_gold_image_url", key: "rose_gold_image_url", aliases: ["rose_gold", "rose_gold_image", "rose_gold_url", "rose_gold_view", "rose_gold_view_image"] },
    { header: "price", key: "price", aliases: ["price_label"] },
    { header: "description", key: "description", aliases: ["product_description"] },
    { header: "details", key: "details", aliases: ["detail_lines"] }
  ];

  function normalizeStringArray(value, separatorPattern = /[\n,]/) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item || "").trim()).filter(Boolean);
    }

    return String(value || "")
      .split(separatorPattern)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function isSpreadsheetErrorValue(value) {
    return /^#(?:name\?|n\/a|na|value!|ref!|div\/0!|num!|error!|null!)$/i.test(String(value || "").trim());
  }

  function sanitizeSheetCellValue(value) {
    const input = String(value || "").trim();
    return isSpreadsheetErrorValue(input) ? "" : input;
  }

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normalizeSheetKey(value) {
    return slugify(value).replace(/-/g, "_");
  }

  function getSheetColumnAliases(column) {
    return Array.from(new Set([column.key, column.header, ...(column.aliases || [])].map((item) => normalizeSheetKey(item)).filter(Boolean)));
  }

  function buildSheetColumnLookup() {
    const lookup = new Map();

    marisSheetColumnSchema.forEach((column) => {
      getSheetColumnAliases(column).forEach((alias) => {
        if (!lookup.has(alias)) {
          lookup.set(alias, column.key);
        }
      });
    });

    return lookup;
  }

  const sheetColumnLookup = buildSheetColumnLookup();

  function resolveSheetColumnKey(header) {
    const normalizedHeader = normalizeSheetKey(header);
    return sheetColumnLookup.get(normalizedHeader) || normalizedHeader;
  }

  function mapCollectionAlias(value) {
    const normalized = slugify(value);
    const mappedAliases = {
      ws: "wedding-set",
      "wedding-set": "wedding-set",
      "wedding-sets": "wedding-set",
      "wedding-set-collection": "wedding-set",
      er: "engagement-ring",
      "engagement-ring": "engagement-ring",
      "engagement-rings": "engagement-ring",
      wb: "wedding-bands",
      "wedding-band": "wedding-bands",
      "wedding-bands": "wedding-bands",
      mb: "mens-wedding-bands",
      "mens-ring": "mens-wedding-bands",
      "mens-rings": "mens-wedding-bands",
      "mens-wedding-band": "mens-wedding-bands",
      "mens-wedding-bands": "mens-wedding-bands",
      np: "necklaces-pendants",
      necklaces: "necklaces-pendants",
      "necklaces-pendants": "necklaces-pendants",
      pendants: "necklaces-pendants",
      pendant: "necklaces-pendants",
      pandant: "necklaces-pendants",
      sp: "necklaces-pendants",
      br: "bracelets",
      bracelets: "bracelets",
      ea: "earrings",
      earrings: "earrings",
      se: "earrings",
      rg: "rings",
      rings: "rings",
      sr: "rings"
    };

    return mappedAliases[normalized] || "";
  }

  function inferCollectionFromWebsiteCode(code) {
    const normalizedCode = String(code || "").toUpperCase();

    if (!normalizedCode) {
      return "";
    }

    const configuredCollection = Object.entries(marisBaseCollectionProducts).find(([, codes]) => Array.isArray(codes) && codes.includes(normalizedCode));

    if (configuredCollection) {
      return configuredCollection[0];
    }

    if (normalizedCode.startsWith("WS")) {
      return "wedding-set";
    }

    if (normalizedCode.startsWith("ER") || normalizedCode.startsWith("DR")) {
      return "engagement-ring";
    }

    if (normalizedCode.startsWith("WB")) {
      return "wedding-bands";
    }

    if (normalizedCode.startsWith("MB")) {
      return "mens-wedding-bands";
    }

    if (normalizedCode.startsWith("NP")) {
      return "necklaces-pendants";
    }

    if (normalizedCode.startsWith("BR")) {
      return "bracelets";
    }

    if (normalizedCode.startsWith("EA")) {
      return "earrings";
    }

    if (normalizedCode.startsWith("RG")) {
      return "rings";
    }

    return "";
  }

  function inferCollectionFromStockId(value) {
    const normalized = String(value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "");

    if (normalized.startsWith("SR")) {
      return "rings";
    }

    if (normalized.startsWith("SE")) {
      return "earrings";
    }

    if (normalized.startsWith("SP")) {
      return "necklaces-pendants";
    }

    return "";
  }

  function getWebsiteCodePrefix(collectionKey) {
    const codePrefixes = {
      "wedding-set": "WS",
      "engagement-ring": "ER",
      "wedding-bands": "WB",
      "mens-wedding-bands": "MB",
      "necklaces-pendants": "NP",
      bracelets: "BR",
      earrings: "EA",
      rings: "RG"
    };

    return codePrefixes[collectionKey] || "";
  }

  function formatSheetTypeLabel(type) {
    const normalizedType = String(type || "").trim().toUpperCase();
    const labels = {
      WS: "Wedding set / แหวนแต่งงาน",
      ER: "Engagement ring / แหวนหมั้น",
      WB: "Wedding band / แหวนแถว",
      MB: "Men's wedding band / แหวนแต่งงานผู้ชาย"
    };

    return labels[normalizedType] || "";
  }

  function expandSheetTypeLabels(text) {
    return String(text || "").replace(/\bType\s+(WS|ER|WB|MB)\b(?!\s*\()/gi, (match, type) => {
      const normalizedType = type.toUpperCase();
      const typeLabel = formatSheetTypeLabel(normalizedType);
      return typeLabel ? `Type ${normalizedType} (${typeLabel})` : match;
    });
  }

  function extractGoogleDriveId(url) {
    const input = String(url || "").trim();
    const patterns = [
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i,
      /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i,
      /drive\.google\.com\/uc\?(?:[^#]*&)?id=([a-zA-Z0-9_-]+)/i,
      /[?&]id=([a-zA-Z0-9_-]+)/i
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);

      if (match?.[1]) {
        return match[1];
      }
    }

    return "";
  }

  function hasImageFileExtension(value) {
    return /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(String(value || "").trim());
  }

  function normalizeCommonImageExtensionTypos(value) {
    return String(value || "").trim().replace(/\.(png|jpe?g|webp|gif|svg|avif)g(?=$|[?#])/i, ".$1");
  }

  function getAssetBasename(value) {
    return String(value || "")
      .trim()
      .replace(/\\/g, "/")
      .split("/")
      .pop() || "";
  }

  function getAssetStem(value) {
    return getAssetBasename(value).replace(/\.[^.]+$/, "").trim().toLowerCase();
  }

  function getAssetDirectory(value) {
    const normalized = String(value || "").trim().replace(/\\/g, "/");
    const slashIndex = normalized.lastIndexOf("/");
    return slashIndex >= 0 ? normalized.slice(0, slashIndex) : "";
  }

  let cachedKnownAssetMaps = null;

  function getKnownLocalAssetMaps() {
    if (cachedKnownAssetMaps) {
      return cachedKnownAssetMaps;
    }

    const byName = new Map();
    const byStem = new Map();
    const assetQueue = [];

    marisBaseProducts.forEach((product) => {
      if (!product || typeof product !== "object") {
        return;
      }

      assetQueue.push(product.image, product.hover);

      if (Array.isArray(product.gallery)) {
        product.gallery.forEach((item) => {
          if (typeof item === "string") {
            assetQueue.push(item);
            return;
          }

          if (item && typeof item === "object") {
            assetQueue.push(item.src);
          }
        });
      }
    });

    assetQueue.forEach((assetPath) => {
      const normalizedPath = String(assetPath || "").trim().replace(/\\/g, "/");

      if (!normalizedPath || /^https?:\/\//i.test(normalizedPath) || !hasImageFileExtension(normalizedPath)) {
        return;
      }

      const basename = getAssetBasename(normalizedPath).toLowerCase();
      const stem = getAssetStem(normalizedPath);

      if (!byName.has(basename)) {
        byName.set(basename, normalizedPath);
      }

      const stemMatches = byStem.get(stem) || [];

      if (!stemMatches.includes(normalizedPath)) {
        stemMatches.push(normalizedPath);
        byStem.set(stem, stemMatches);
      }
    });

    cachedKnownAssetMaps = { byName, byStem };
    return cachedKnownAssetMaps;
  }

  function resolveSheetFilenameToAssetPath(value, options = {}) {
    const input = normalizeCommonImageExtensionTypos(value);

    if (!input) {
      return "";
    }

    if (/^(?:data:|blob:)/i.test(input) || /^[a-z][a-z0-9+.-]*:/i.test(input)) {
      return input;
    }

    const normalizedInput = input.replace(/\\/g, "/");

    if (normalizedInput.startsWith("../") || normalizedInput.startsWith("./")) {
      return normalizedInput;
    }

    if (normalizedInput.startsWith("assets/")) {
      return `../${normalizedInput}`;
    }

    const { byName, byStem } = getKnownLocalAssetMaps();
    const exactMatch = byName.get(getAssetBasename(normalizedInput).toLowerCase());

    if (exactMatch) {
      return exactMatch;
    }

    const stemMatches = byStem.get(getAssetStem(normalizedInput)) || [];

    if (stemMatches.length === 1) {
      return stemMatches[0];
    }

    const fallbackDirectory = getAssetDirectory(
      options.existingProduct?.image
      || options.existingProduct?.hover
      || options.existingProduct?.gallery?.[0]?.src
      || ""
    );

    if (fallbackDirectory && /\.[a-z0-9]{3,5}(?:[?#].*)?$/i.test(normalizedInput)) {
      return `${fallbackDirectory}/${getAssetBasename(normalizedInput)}`;
    }

    if (!normalizedInput.includes("/") && hasImageFileExtension(normalizedInput)) {
      const sheetCollection = slugify(options.record?.collection || "");
      const sheetDirectory = sheetCollection === "infinite-hold"
        ? "../assets/images/catalogue/INfinite hold"
        : "../assets/images/catalogue";

      return `${sheetDirectory}/${getAssetBasename(normalizedInput)}`;
    }

    return normalizedInput;
  }

  function normalizePublicAssetUrl(url, options = {}) {
    const input = String(url || "").trim();

    if (!input) {
      return "";
    }

    if (/^https?:\/\/drive\.google\.com/i.test(input)) {
      const driveId = extractGoogleDriveId(input);
      return driveId ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w1600` : input;
    }

    return resolveSheetFilenameToAssetPath(input, options);
  }

  function inferShapeFromCenter(center) {
    const source = String(center || "").toLowerCase();

    if (!source) {
      return "";
    }

    const shapeMap = [
      ["pear", "pear"],
      ["oval", "oval"],
      ["emerald", "emerald"],
      ["cushion", "cushion"],
      ["marquise", "marquise"],
      ["round", "round"],
      ["rd", "round"]
    ];

    const match = shapeMap.find(([needle]) => source.includes(needle));
    return match ? match[1] : "";
  }

  function inferCollectionKey(candidate) {
    const explicitCollection = String(candidate?.collectionKey || candidate?.collection_key || "").trim();

    if (explicitCollection) {
      const mappedExplicit = mapCollectionAlias(explicitCollection);

      if (mappedExplicit) {
        return mappedExplicit;
      }
    }

    const code = String(candidate?.code || "").toUpperCase();

    if (code) {
      const inferredFromCode = inferCollectionFromWebsiteCode(code);

      if (inferredFromCode) {
        return inferredFromCode;
      }
    }

    const typeValue = slugify(candidate?.type || candidate?.product_type || "");
    const collectionValue = slugify(candidate?.collection || candidate?.category || candidate?.page_category || "");

    return mapCollectionAlias(typeValue) || mapCollectionAlias(collectionValue) || inferCollectionFromStockId(candidate?.id);
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      const nextCharacter = text[index + 1];

      if (character === '"') {
        if (inQuotes && nextCharacter === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }

        continue;
      }

      if (character === "," && !inQuotes) {
        row.push(cell);
        cell = "";
        continue;
      }

      if ((character === "\n" || character === "\r") && !inQuotes) {
        if (character === "\r" && nextCharacter === "\n") {
          index += 1;
        }

        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
        continue;
      }

      cell += character;
    }

    if (cell.length || row.length) {
      row.push(cell);
      rows.push(row);
    }

    return rows;
  }

  function findHeaderRow(rows) {
    const interestingHeaders = marisSheetColumnSchema.map((column) => column.key);

    return rows.findIndex((row) => {
      const normalized = row.map((cell) => resolveSheetColumnKey(cell));
      return normalized.some((cell) => interestingHeaders.includes(cell));
    });
  }

  function buildSheetSchemaState(rawHeaders) {
    const actualHeaders = rawHeaders.map((header) => String(header || "").trim());
    const canonicalKeys = marisSheetColumnSchema.map((column) => column.key);
    const columnMapping = {};
    const extraHeaders = [];

    actualHeaders.forEach((header, index) => {
      const normalizedHeader = normalizeSheetKey(header);
      const resolvedKey = resolveSheetColumnKey(header);

      if (!normalizedHeader) {
        return;
      }

      if (canonicalKeys.includes(resolvedKey)) {
        if (!columnMapping[resolvedKey]) {
          columnMapping[resolvedKey] = {
            key: resolvedKey,
            header,
            index
          };
        }

        return;
      }

      extraHeaders.push(header);
    });

    return {
      canonicalColumns: marisSheetColumnSchema.map((column) => ({ ...column })),
      actualHeaders,
      mapsByHeaderName: true,
      columnMapping,
      missingKeys: canonicalKeys.filter((key) => !columnMapping[key]),
      missingRequiredKeys: marisSheetColumnSchema.filter((column) => column.required && !columnMapping[column.key]).map((column) => column.key),
      extraHeaders
    };
  }

  function rowToRecord(headers, row) {
    return headers.reduce((record, header, index) => {
      const normalizedHeader = normalizeSheetKey(header);
      const resolvedKey = resolveSheetColumnKey(header);
      const value = sanitizeSheetCellValue(row[index]);

      if (!resolvedKey) {
        return record;
      }

      if (!String(record[resolvedKey] || "").trim()) {
        record[resolvedKey] = value;
      }

      if (normalizedHeader && normalizedHeader !== resolvedKey && !String(record[normalizedHeader] || "").trim()) {
        record[normalizedHeader] = value;
      }

      return record;
    }, {});
  }

  function firstNonEmpty(record, keys) {
    const matchedKey = keys.find((key) => String(record[key] || "").trim());
    return matchedKey ? String(record[matchedKey] || "").trim() : "";
  }

  function buildSheetFallbackDescription(record) {
    const id = firstNonEmpty(record, ["id", "sku", "code"]);
    const collection = firstNonEmpty(record, ["collection", "product_name", "name"]);
    const type = firstNonEmpty(record, ["type", "product_type"]);
    const center = firstNonEmpty(record, ["center", "center_stone"]);
    const malee = firstNonEmpty(record, ["malee", "side_stones"]);
    const goldWeight = firstNonEmpty(record, ["gold_weight", "goldweight"]);

    if (!id && !collection && !type && !center && !malee && !goldWeight) {
      return "";
    }

    const fragments = [];

    if (id) {
      fragments.push(`SKU ${id}`);
    }

    if (collection) {
      fragments.push(`from the ${collection} collection`);
    }

    if (type) {
      const typeLabel = formatSheetTypeLabel(type);
      fragments.push(typeLabel ? `Type ${type} (${typeLabel})` : `Type ${type}`);
    }

    if (center) {
      fragments.push(`center stone ${center}`);
    }

    if (malee) {
      fragments.push(`Malee ${malee}`);
    }

    if (goldWeight) {
      fragments.push(`gold weight ${goldWeight}`);
    }

    return fragments.join(". ").replace(/\.\s(?=[a-z])/g, ". ");
  }

  function buildSheetFallbackDetails(record, existingProduct) {
    const explicitDetails = normalizeStringArray(firstNonEmpty(record, ["details", "detail_lines"]), /\n|\|/);

    if (explicitDetails.length) {
      return explicitDetails;
    }

    const details = [];
    const existingDetails = normalizeStringArray(existingProduct?.details || [], /\n/);
    const center = firstNonEmpty(record, ["center", "center_stone"]);
    const malee = firstNonEmpty(record, ["malee", "side_stones"]);
    const goldWeight = firstNonEmpty(record, ["gold_weight", "goldweight"]);
    const metal = firstNonEmpty(record, ["metal", "metal_tag"])
      || existingDetails.find((detail) => /gold/i.test(detail))
      || "";
    const availability = existingDetails.find((detail) => /available in/i.test(detail)) || "";

    if (center) {
      details.push(center);
    }

    if (malee) {
      details.push(`Malee ${malee}`);
    }

    if (metal) {
      details.push(metal);
    }

    if (goldWeight) {
      details.push(goldWeight);
    }

    if (availability && !details.includes(availability)) {
      details.push(availability);
    }

    return details.length ? details : existingDetails;
  }

  function parseGalleryValue(value, fallbackTitle, options = {}) {
    const lines = normalizeStringArray(value, /\n/);

    return lines
      .map((line, index) => {
        const segments = line.split("|").map((item) => item.trim()).filter(Boolean);

        if (!segments.length) {
          return null;
        }

        if (segments.length === 1) {
          return {
            src: normalizePublicAssetUrl(segments[0], options),
            alt: `${fallbackTitle} view ${index + 1}`,
            label: `View ${index + 1}`
          };
        }

        return {
          label: segments[0] || `View ${index + 1}`,
          src: normalizePublicAssetUrl(segments[1], options),
          alt: segments[2] || `${fallbackTitle} ${segments[0] || `view ${index + 1}`}`
        };
      })
      .filter((item) => item?.src);
  }

  function buildGalleryFromColumns(record, fallbackTitle, options = {}) {
    const imageColumns = [
      {
        label: "White Gold View",
        keys: ["white_gold_image", "white_gold_image_url", "white_gold_url", "white_gold", "white_gold_view", "white_gold_view_image", "image", "image_url", "main_image", "main_image_url", "cover_image", "cover_image_url"],
        alt: `${fallbackTitle} white gold view`
      },
      {
        label: "Top View",
        keys: ["top_image", "top_image_url", "top_url", "top", "top_view", "top_view_image"],
        alt: `${fallbackTitle} top view`
      },
      {
        label: "Front View",
        keys: ["front_image", "front_image_url", "front_url", "front", "front_view", "front_view_image"],
        alt: `${fallbackTitle} front view`
      },
      {
        label: "Side View",
        keys: ["side_image", "side_image_url", "side_url", "side", "side_view", "side_view_image"],
        alt: `${fallbackTitle} side view`
      },
      {
        label: "Yellow Gold View",
        keys: ["yellow_gold_image", "yellow_gold_image_url", "yellow_gold_url", "yellow_gold", "yellow_gold_view", "yellow_gold_view_image"],
        alt: `${fallbackTitle} yellow gold view`
      },
      {
        label: "Rose Gold View",
        keys: ["rose_gold_image", "rose_gold_image_url", "rose_gold_url", "rose_gold", "rose_gold_view", "rose_gold_view_image"],
        alt: `${fallbackTitle} rose gold view`
      }
    ];

    const seenSources = new Set();

    return imageColumns
      .map((column) => {
        const src = normalizePublicAssetUrl(firstNonEmpty(record, column.keys), options);

        if (!src || seenSources.has(src)) {
          return null;
        }

        seenSources.add(src);
        return {
          label: column.label,
          src,
          alt: column.alt
        };
      })
      .filter(Boolean);
  }

  function normalizeGalleryItems(gallery, fallbackImage, fallbackTitle, options = {}) {
    if (typeof gallery === "string") {
      return parseGalleryValue(gallery, fallbackTitle, options);
    }

    if (!Array.isArray(gallery)) {
      return fallbackImage ? [{
        src: normalizePublicAssetUrl(fallbackImage, options),
        alt: `${fallbackTitle} primary view`,
        label: "Primary View"
      }] : [];
    }

    return gallery
      .map((item, index) => {
        if (typeof item === "string") {
          const src = normalizePublicAssetUrl(item, options);
          return src ? {
            src,
            alt: `${fallbackTitle} view ${index + 1}`,
            label: `View ${index + 1}`
          } : null;
        }

        if (!item || typeof item !== "object") {
          return null;
        }

        const src = normalizePublicAssetUrl(item.src || "", options);

        if (!src) {
          return null;
        }

        const label = String(item.label || `View ${index + 1}`).trim();
        const alt = String(item.alt || `${fallbackTitle} ${label}`).trim();
        const presentation = String(item.presentation || "").trim();

        return {
          src,
          alt,
          label,
          ...(presentation ? { presentation } : {})
        };
      })
      .filter(Boolean);
  }

  function normalizeProductRecord(product) {
    if (!product || typeof product !== "object") {
      return null;
    }

    const code = String(product.code || product.sku || "").trim();

    if (!code) {
      return null;
    }

    const title = String(product.title || code).trim() || code;
    const name = String(product.name || title).trim() || title;
    const image = normalizePublicAssetUrl(product.image || "");
    const hover = normalizePublicAssetUrl(product.hover || image) || image;
    const description = String(product.description || "").trim();
    const price = String(product.price || "Price on request").trim() || "Price on request";
    const details = normalizeStringArray(product.details, /\n/);
    const filterValues = normalizeStringArray(product.filterValues);
    const gallery = normalizeGalleryItems(product.gallery, image, title);
    const collectionKey = inferCollectionKey(product);
    const metal = String(product.metal || "").trim();
    const style = String(product.style || "").trim();
    const shape = String(product.shape || "").trim();
    const imagePresentation = String(product.imagePresentation || "").trim();

    const normalized = {
      ...product,
      code,
      title,
      name,
      details,
      description,
      image,
      hover,
      price,
      filterValues,
      metal,
      style,
      shape,
      collectionKey,
      imagePresentation
    };

    if (gallery.length) {
      normalized.gallery = gallery;
    } else {
      delete normalized.gallery;
    }

    return normalized;
  }

  function mergeProducts(baseProducts, sourceProducts) {
    const merged = new Map(baseProducts.map((product) => [product.code, normalizeProductRecord(product)]));

    sourceProducts.forEach((product) => {
      const normalized = normalizeProductRecord(product);

      if (!normalized) {
        return;
      }

      merged.set(normalized.code, normalized);
    });

    return Array.from(merged.values()).filter(Boolean);
  }

  function mergeCollectionProducts(baseCollectionProducts, sourceProducts) {
    const merged = Object.fromEntries(
      Object.entries(baseCollectionProducts).map(([key, codes]) => [key, Array.isArray(codes) ? [...codes] : []])
    );
    const sourceCodes = new Set();
    const sourceByCollection = {};

    sourceProducts.forEach((product) => {
      const normalized = normalizeProductRecord(product);

      if (!normalized) {
        return;
      }

      sourceCodes.add(normalized.code);

      const collectionKey = inferCollectionKey(normalized);

      if (!collectionKey) {
        return;
      }

      if (!sourceByCollection[collectionKey]) {
        sourceByCollection[collectionKey] = [];
      }

      if (!sourceByCollection[collectionKey].includes(normalized.code)) {
        sourceByCollection[collectionKey].push(normalized.code);
      }
    });

    Object.keys(merged).forEach((key) => {
      merged[key] = merged[key].filter((code) => !sourceCodes.has(code));
    });

    Object.entries(sourceByCollection).forEach(([collectionKey, codes]) => {
      if (!merged[collectionKey]) {
        merged[collectionKey] = [];
      }

      merged[collectionKey] = [...codes, ...merged[collectionKey]];
    });

    return merged;
  }

  function createGeneratedCode(record, fallbackPrefix, index) {
    const rawId = firstNonEmpty(record, ["id", "collection", "product_name", "name"]);
    const compactId = String(rawId || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "");

    return `${fallbackPrefix || "MJ"}${compactId || String(index + 1).padStart(3, "0")}`;
  }

  function getExplicitProductCode(record) {
    return firstNonEmpty(record, ["web_code", "site_code", "code", "sku", "product_code"]).toUpperCase();
  }

  function isReusableSheetCode(code) {
    return Boolean(code && !/\s/.test(code) && code.length <= 32);
  }

  function findMatchingBaseProduct(record, baseProducts) {
    const explicitCode = getExplicitProductCode(record);

    if (explicitCode) {
      const explicitMatch = baseProducts.find((product) => String(product.code).toUpperCase() === explicitCode);

      if (explicitMatch) {
        return explicitMatch;
      }
    }

    const recordId = firstNonEmpty(record, ["id"]);
    const recordType = firstNonEmpty(record, ["type", "product_type"]).toUpperCase();
    const recordCollection = slugify(firstNonEmpty(record, ["collection"]));

    return baseProducts.find((product) => {
      const productSheetId = String(product.sheetId || "").trim();
      const productSheetType = String(product.sheetType || "").trim().toUpperCase();
      const productSheetCollection = slugify(product.sheetCollection || "");

      if (!productSheetId && !productSheetType && !productSheetCollection) {
        return false;
      }

      return (!productSheetId || productSheetId === recordId)
        && (!productSheetType || productSheetType === recordType)
        && (!productSheetCollection || productSheetCollection === recordCollection);
    }) || null;
  }

  function buildSheetProductsFromCsv(csvText, baseProducts) {
    if (!csvText) {
      return [];
    }

    const rows = parseCsv(csvText);
    const headerRowIndex = findHeaderRow(rows);

    if (headerRowIndex < 0) {
      return [];
    }

    const rawHeaders = rows[headerRowIndex];
    window.MARIS_SHEET_SCHEMA = buildSheetSchemaState(rawHeaders);
    window.MARIS_SHEET_HEADERS = window.MARIS_SHEET_SCHEMA.actualHeaders;
    const dataRows = rows
      .slice(headerRowIndex + 1)
      .map((row) => rowToRecord(rawHeaders, row))
      .filter((record) => Object.values(record).some((value) => String(value || "").trim()));

    return dataRows
      .map((record, index) => {
        const existingProduct = findMatchingBaseProduct(record, baseProducts);
        const explicitCode = getExplicitProductCode(record);
        const collectionKey = inferCollectionKey({
          ...record,
          code: existingProduct?.code || explicitCode
        });
        const fallbackPrefix = String(getWebsiteCodePrefix(collectionKey) || firstNonEmpty(record, ["type", "category_code", "category"]) || "MJ")
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "")
          .slice(0, 4);
        const code = existingProduct?.code
          || (isReusableSheetCode(explicitCode) ? explicitCode : "")
          || createGeneratedCode(record, fallbackPrefix, index);
        const title = firstNonEmpty(record, ["title", "card_title", "web_title"]).trim() || existingProduct?.title || code;
        const name = firstNonEmpty(record, ["name", "product_name", "display_name"]).trim()
          || existingProduct?.name
          || firstNonEmpty(record, ["collection"]).trim()
          || code;
        const assetContext = { record, existingProduct };
        const galleryFromColumns = buildGalleryFromColumns(record, title, assetContext);
        const image = normalizePublicAssetUrl(
          firstNonEmpty(record, ["image", "image_url", "main_image", "main_image_url", "cover_image", "cover_image_url", "white_gold_image", "white_gold_image_url", "white_gold"])
          || galleryFromColumns[0]?.src
          || existingProduct?.image
          || "",
          assetContext
        );
        const hover = normalizePublicAssetUrl(
          firstNonEmpty(record, ["hover", "hover_image", "hover_image_url"])
          || galleryFromColumns[1]?.src
          || existingProduct?.hover
          || image,
          assetContext
        ) || image;
        const description = expandSheetTypeLabels(
          firstNonEmpty(record, ["description", "product_description"]).trim()
            || buildSheetFallbackDescription(record)
            || existingProduct?.description
            || ""
        );
        const details = buildSheetFallbackDetails(record, existingProduct);
        const metal = firstNonEmpty(record, ["metal", "metal_tag"]).trim() || existingProduct?.metal || "";
        const style = firstNonEmpty(record, ["style", "style_tag"]).trim() || existingProduct?.style || "";
        const shape = firstNonEmpty(record, ["shape", "shape_tag"]).trim()
          || inferShapeFromCenter(firstNonEmpty(record, ["center", "center_stone"]))
          || existingProduct?.shape
          || "";
        const filterValues = Array.from(new Set([
          ...normalizeStringArray(firstNonEmpty(record, ["filter_values", "filters"]), /[\n,|]/),
          metal,
          style,
          shape
        ].filter(Boolean)));
        const price = firstNonEmpty(record, ["price", "price_label"]).trim() || existingProduct?.price || "Price on request";
        const imagePresentation = firstNonEmpty(record, ["image_presentation", "image_fit"]).trim() || existingProduct?.imagePresentation || "";
        const galleryValue = firstNonEmpty(record, ["gallery", "gallery_images"]);
        const gallery = galleryValue
          ? normalizeGalleryItems(galleryValue, image, title, assetContext)
          : normalizeGalleryItems(galleryFromColumns, image, title, assetContext);

        if (!image) {
          return null;
        }

        return normalizeProductRecord({
          ...existingProduct,
          ...record,
          code,
          title,
          name,
          details,
          description,
          image,
          hover,
          price,
          metal,
          style,
          shape,
          filterValues,
          gallery: gallery.length ? gallery : existingProduct?.gallery || [],
          imagePresentation,
          collectionKey,
          sheetId: firstNonEmpty(record, ["id"]) || existingProduct?.sheetId || "",
          sheetType: firstNonEmpty(record, ["type", "product_type"]) || existingProduct?.sheetType || "",
          sheetCollection: firstNonEmpty(record, ["collection"]) || existingProduct?.sheetCollection || ""
        });
      })
      .filter(Boolean);
  }

  function normalizeApiProduct(product) {
    // Supabase returns: sku, primaryImageUrl, images[], basePrice, collection, slug
    const primaryImage = product.primaryImageUrl
      || (Array.isArray(product.images) && product.images.length > 0 ? product.images[0].imageUrl : "")
      || product.image
      || "";

    const gallery = Array.isArray(product.images) && product.images.length > 0
      ? product.images.map((img) => ({
          src: img.imageUrl || "",
          alt: img.altText || "",
          label: img.isPrimary ? "Primary View" : `View ${(img.sortOrder || 0) + 1}`,
          presentation: ""
        }))
      : Array.isArray(product.gallery) ? product.gallery : [];

    const price = product.basePrice != null && product.basePrice !== ""
      ? `฿${Number(product.basePrice).toLocaleString()}`
      : (product.price || "Price on request");

    return normalizeProductRecord({
      id: product.id,
      code: product.sku || product.code,
      title: product.name || product.sku || product.code,
      name: product.name || product.title || product.sku || product.code,
      nameTh: product.nameTh || "",
      collectionKey: product.collectionKey
        || mapCollectionAlias(product.collection || product.category || ""),
      category: product.category || "",
      description: product.description || "",
      details: Array.isArray(product.details) ? product.details : [],
      price,
      image: primaryImage,
      hover: (gallery[1] && gallery[1].src) || primaryImage,
      gallery,
      filterValues: Array.isArray(product.filterValues) ? product.filterValues : [],
      imagePresentation: product.imagePresentation || "",
      stockState: product.stockState || "",
      availableQuantity: product.availableQuantity,
      updatedAt: product.updatedAt || ""
    });
  }

  async function fetchPublicCatalogueProducts() {
    try {
      const response = await fetch(publicCatalogueApiUrl, {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Catalogue request failed with ${response.status}`);
      }

      const payload = await response.json();
      const products = Array.isArray(payload.products)
        ? payload.products.map((product) => normalizeApiProduct(product)).filter(Boolean)
        : [];

      return {
        products,
        status: payload.status || (products.length ? "ready" : "empty"),
        source: payload.source || "supabase",
        checkedAt: payload.checkedAt || new Date().toISOString()
      };
    } catch (error) {
      console.warn("Maris Supabase catalogue could not be loaded.", error);
      return {
        products: [],
        status: "error",
        source: "supabase",
        checkedAt: new Date().toISOString()
      };
    }
  }

  function applyCatalogueState(baseProducts, sheetProducts, options = {}) {
    const preferSheetProducts = options.preferSheetProducts === true && sheetProducts.length > 0;
    const activeBaseProducts = [];
    const overrideProducts = preferSheetProducts ? sheetProducts : [];
    const baseCollectionProducts = {};

    window.MARIS_BASE_PRODUCTS = baseProducts;
    window.MARIS_BASE_COLLECTION_META = { ...marisBaseCollectionMeta };
    window.MARIS_BASE_COLLECTION_PRODUCTS = Object.fromEntries(
      Object.entries(marisBaseCollectionProducts).map(([key, codes]) => [key, [...codes]])
    );
    window.MARIS_SHEET_PRODUCTS = Array.isArray(options.sheetProducts) ? options.sheetProducts : [];
    window.MARIS_COLLECTION_META = { ...marisBaseCollectionMeta };
    window.MARIS_PRODUCTS = mergeProducts(activeBaseProducts, overrideProducts);
    window.MARIS_COLLECTION_PRODUCTS = mergeCollectionProducts(baseCollectionProducts, overrideProducts);
  }

  const normalizedBaseProducts = marisBaseProducts.map((product) => normalizeProductRecord(product)).filter(Boolean);

  window.MARIS_GOOGLE_SHEET_SOURCE_URL = "";
  window.MARIS_GOOGLE_SHEET_URL = "";
  window.MARIS_SHEET_COLUMN_SCHEMA = marisSheetColumnSchema.map((column) => ({ ...column }));
  window.MARIS_SHEET_SCHEMA = {
    canonicalColumns: window.MARIS_SHEET_COLUMN_SCHEMA,
    actualHeaders: [],
    mapsByHeaderName: true,
    columnMapping: {},
    missingKeys: marisSheetColumnSchema.map((column) => column.key),
    missingRequiredKeys: marisSheetColumnSchema.filter((column) => column.required).map((column) => column.key),
    extraHeaders: []
  };
  window.MARIS_SHEET_HEADERS = [];
  window.MARIS_SHEET_STATUS = {
    source: "supabase",
    status: "loading",
    sheetUrl: "",
    sheetProductCount: 0,
    productCount: normalizedBaseProducts.length,
    updatedAt: new Date().toISOString()
  };
  applyCatalogueState(normalizedBaseProducts, []);
  window.MARIS_DATA_READY = fetchPublicCatalogueProducts()
    .then(({ products: apiProducts, status, source, checkedAt }) => {
      applyCatalogueState(normalizedBaseProducts, apiProducts, {
        preferSheetProducts: status === "ready" || status === "empty"
      });
      window.MARIS_SHEET_STATUS = {
        source,
        status,
        sheetUrl: "",
        sheetProductCount: 0,
        productCount: window.MARIS_PRODUCTS.length,
        updatedAt: checkedAt || new Date().toISOString()
      };
      window.dispatchEvent(new CustomEvent("maris:catalogue-data-updated", {
        detail: {
          source,
          status,
          sheetUrl: "",
          sheetProductCount: 0,
          productCount: window.MARIS_PRODUCTS.length
        }
      }));
    })
    .catch(() => {
      window.MARIS_SHEET_STATUS = {
        source: "supabase",
        status: "error",
        sheetUrl: "",
        sheetProductCount: 0,
        productCount: window.MARIS_PRODUCTS.length,
        updatedAt: new Date().toISOString()
      };
      window.dispatchEvent(new CustomEvent("maris:catalogue-data-updated", {
        detail: {
          source: "supabase",
          status: "error",
          sheetUrl: "",
          sheetProductCount: 0,
          productCount: window.MARIS_PRODUCTS.length
        }
      }));
    });
})();
