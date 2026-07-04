(function (root) {
  const IMAGE_EXTENSIONS = /\.(avif|gif|jpe?g|png|webp)$/i;

  const METAL_DEFINITIONS = [
    { key: "white-gold", label: "White Gold", order: 0, pattern: /\bwhite\s*gold\b|\bwhitegold\b/i },
    { key: "yellow-gold", label: "Yellow Gold", order: 1, pattern: /\byellow\s*gold\b|\byellowgold\b/i },
    { key: "rose-gold", label: "Rose Gold", order: 2, pattern: /\brose\s*gold\b|\brosegold\b/i },
    { key: "platinum", label: "Platinum", order: 3, pattern: /\bplatinum\b/i },
    { key: "silver", label: "Silver", order: 4, pattern: /\bsilver\b/i }
  ];

  const VIEW_DEFINITIONS = [
    { key: "hero", label: "Hero view", order: 0, leading: /^(hero|main)\b/i, pattern: /\b(hero|main|logo)\b/i },
    { key: "top", label: "Top view", order: 1, leading: /^top\b/i, pattern: /\btop\b/i },
    { key: "front", label: "Front view", order: 2, leading: /^front\b/i, pattern: /\bfront\b/i },
    { key: "side", label: "Side view", order: 3, leading: /^side\b/i, pattern: /\bside\b/i },
    { key: "back", label: "Back view", order: 4, leading: /^back\b/i, pattern: /\bback\b/i },
    { key: "detail", label: "Detail view", order: 8, leading: /^detail\b/i, pattern: /\b(detail|angle|close)\b/i }
  ];

  const SHAPE_DEFINITIONS = [
    { label: "Oval", pattern: /\boval\b/i },
    { label: "Round", pattern: /\bround\b/i },
    { label: "Emerald", pattern: /\bemerald\b/i },
    { label: "Princess", pattern: /\bprincess\b/i },
    { label: "Pear", pattern: /\bpear\b/i },
    { label: "Marquise", pattern: /\bmarquise\b/i },
    { label: "Cushion", pattern: /\bcushion\b/i }
  ];

  function cleanSpaces(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function stripExtension(fileName) {
    return String(fileName || "").replace(/\.[^.]+$/, "");
  }

  function toReadableName(fileName) {
    return cleanSpaces(stripExtension(fileName).replace(/[_-]+/g, " "));
  }

  function isImageFile(file) {
    const name = String(file?.name || "");
    const type = String(file?.type || "");
    return IMAGE_EXTENSIONS.test(name) || type.toLowerCase().startsWith("image/");
  }

  function detectCode(text) {
    const readable = toReadableName(text);
    const raw = stripExtension(text);
    const hyphenCode = raw.match(/\b[A-Z]{2,5}(?:-[A-Z0-9]{2,6})+\b/i);

    if (hyphenCode) {
      return hyphenCode[0].toUpperCase();
    }

    const spacedCode = readable.match(/\b([A-Z]{1,5})\s+(\d{3,6}[A-Z]?)\b/i);

    if (spacedCode) {
      return `${spacedCode[1].toUpperCase()} ${spacedCode[2].toUpperCase()}`;
    }

    const compactCode = raw.match(/\b([A-Z]{1,5})(\d{3,6}[A-Z]?)\b/i);

    if (compactCode) {
      return `${compactCode[1].toUpperCase()} ${compactCode[2].toUpperCase()}`;
    }

    return "";
  }

  function detectMetal(text) {
    return METAL_DEFINITIONS.find((definition) => definition.pattern.test(text)) || null;
  }

  function detectView(text) {
    const readable = toReadableName(text);
    const leadingView = VIEW_DEFINITIONS.find((definition) => definition.leading.test(readable));

    if (leadingView) {
      return leadingView;
    }

    return VIEW_DEFINITIONS.find((definition) => definition.pattern.test(readable))
      || { key: "detail", label: "Detail view", order: 8 };
  }

  function removeDetectedCode(text, code) {
    if (!code) {
      return text;
    }

    const escapedParts = code.split(/[\s-]+/).filter(Boolean).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const codePattern = new RegExp(`\\b${escapedParts.join("[\\s-]*")}\\b`, "i");
    return text.replace(codePattern, " ");
  }

  function buildProductName(fileName, code) {
    let name = toReadableName(fileName)
      .replace(/^(front|side|top|back|hero|main|detail|angle|close)\s+/i, " ");

    name = removeDetectedCode(name, code);
    name = name
      .replace(/\bin\s+(white\s*gold|whitegold|yellow\s*gold|yellowgold|rose\s*gold|rosegold|platinum|silver)\b/ig, " ")
      .replace(/\b(white\s*gold|whitegold|yellow\s*gold|yellowgold|rose\s*gold|rosegold|platinum|silver)\b/ig, " ")
      .replace(/\b(logo|hero|main)\b/ig, " ");

    return cleanSpaces(name);
  }

  function pickMostCommon(values) {
    const counts = new Map();

    values.filter(Boolean).forEach((value) => {
      counts.set(value, (counts.get(value) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1] || right[0].length - left[0].length)
      .map(([value]) => value)[0] || "";
  }

  function uniqueSortedMetals(images) {
    const byKey = new Map();

    images.forEach((image) => {
      if (image.metal) {
        byKey.set(image.metal.key, image.metal);
      }
    });

    return Array.from(byKey.values()).sort((left, right) => left.order - right.order);
  }

  function inferShape(productName) {
    return SHAPE_DEFINITIONS.find((shape) => shape.pattern.test(productName))?.label || "";
  }

  function inferStyle(productName) {
    if (/\bcluster\b/i.test(productName)) {
      return "Cluster";
    }

    if (/\bhalo\b/i.test(productName)) {
      return "Halo";
    }

    if (/\bsolitaire\b/i.test(productName)) {
      return "Solitaire";
    }

    return "";
  }

  function inferCollectionKey({ code, productName }) {
    const compactCode = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const name = String(productName || "").toLowerCase();

    if (/^(ER|DR)/.test(compactCode) || /\bengagement\b/.test(name)) {
      return "engagement-ring";
    }

    if (/^WB/.test(compactCode) || /\bwedding\s+band\b/.test(name)) {
      return "wedding-bands";
    }

    if (/^(MR|MB|MWB)/.test(compactCode) || /\bmen'?s\b/.test(name)) {
      return "mens-wedding-bands";
    }

    if (/^(NP|PD)/.test(compactCode) || /\b(necklace|pendant)\b/.test(name)) {
      return "necklaces-pendants";
    }

    if (/^BR/.test(compactCode) || /\bbracelet\b/.test(name)) {
      return "bracelets";
    }

    if (/^(EA|SE)/.test(compactCode) || /\bearring\b/.test(name)) {
      return "earrings";
    }

    if (/\bring\b/.test(name)) {
      return "rings";
    }

    return "";
  }

  function parseImageFile(file) {
    const fileName = String(file?.name || "");
    const code = detectCode(fileName);
    const productName = buildProductName(fileName, code);
    const metal = detectMetal(fileName);
    const view = detectView(fileName);

    return {
      file,
      fileName,
      code,
      productName,
      metal,
      metalKey: metal?.key || "",
      metalLabel: metal?.label || "",
      viewKey: view.key,
      viewLabel: view.label,
      sortWeight: ((metal?.order ?? 9) * 10) + view.order
    };
  }

  function buildImageFileGroup(files) {
    const parsedImages = Array.from(files || [])
      .filter(isImageFile)
      .map(parseImageFile)
      .filter((image) => image.fileName);

    const code = pickMostCommon(parsedImages.map((image) => image.code));
    const productName = pickMostCommon(parsedImages.map((image) => image.productName));
    const metals = uniqueSortedMetals(parsedImages);
    const shape = inferShape(productName);
    const style = inferStyle(productName);
    const collectionKey = inferCollectionKey({ code, productName });
    const orderedImages = [...parsedImages].sort((left, right) => (
      left.sortWeight - right.sortWeight
      || left.fileName.localeCompare(right.fileName, undefined, { numeric: true })
    ));

    orderedImages.forEach((image) => {
      const pieces = [productName || code, image.metalLabel, image.viewLabel].filter(Boolean);
      image.altText = cleanSpaces(pieces.join(" "));
    });

    const mainImage = orderedImages[0] || null;
    const galleryImages = orderedImages.slice(1);
    const metalLabels = metals.map((metal) => metal.label);

    return {
      ok: orderedImages.length > 0,
      code,
      productName,
      title: productName || code,
      metalLabels,
      metals,
      shape,
      style,
      collectionKey,
      orderedImages,
      mainImage,
      galleryImages,
      mainImageFile: mainImage?.file || null,
      galleryImageFiles: galleryImages.map((image) => image.file),
      summary: cleanSpaces([
        code,
        productName,
        metalLabels.join(", "),
        `${orderedImages.length} image${orderedImages.length === 1 ? "" : "s"}`
      ].filter(Boolean).join(" - "))
    };
  }

  root.MARIS_ADMIN_IMAGE_GROUP = {
    buildImageFileGroup,
    parseImageFile
  };
})(typeof window !== "undefined" ? window : globalThis);
