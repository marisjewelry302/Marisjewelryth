(function (root) {
  // Jewellery CAD tools (MatrixGold, RhinoGold, 3Design, JewelCAD) and hand-made
  // sheets all export a "gem report", each with its own headers, delimiter,
  // encoding and units. Nothing here assumes one layout: the header row is the
  // one that names the most gem columns, each column is recognised by what its
  // header says, and numbers are read out of whatever text surrounds them.

  const MAX_STONE_ROWS = 200;
  const HEADER_SCAN_ROWS = 20;
  const ROUND_SHAPE = /round|brilliant|กลม/i;
  const TOTAL_ROW = /^(grand\s*)?(sub\s*)?totals?\b|^sum\b|^รวม/i;

  // Each role is claimed by the first unclaimed header one of its patterns
  // matches, in this order: "Gem Count" becomes the quantity before "gem" can
  // make it the stone name, "Stone Weight" a carat column before it can be the
  // stone, and "Total Ct" the total before plain "ct" can take it. Headers are
  // lower-cased with punctuation turned to spaces first, so "Ct. Wt." reads
  // "ct wt". Thai words have no \b word boundary, so they match as substrings.
  const COLUMN_ROLES = [
    {
      role: "caratTotal",
      patterns: [
        /\b(total|tot|sum)\b.*\b(ct|cts|carats?|weight|wt)\b/,
        /\b(ctw|tcw|tw)\b/,
        /(กะรัต|น้ำหนัก).*รวม|รวม.*(กะรัต|น้ำหนัก)/
      ]
    },
    {
      role: "caratEach",
      patterns: [
        /\b(ct|cts|carats?|weight|wt)\b.*\b(each|ea|per|pc|pcs|piece|unit|single)\b/,
        /\b(each|unit|single)\b.*\b(ct|cts|carats?|weight|wt)\b/,
        /ต่อเม็ด/
      ]
    },
    {
      role: "carat",
      patterns: [/\b(ct|cts|carats?|weight|wt)\b/, /กะรัต|น้ำหนัก/],
      // Metal weight sits in the same reports and is never carats.
      exclude: /\b(metal|gold|silver|platinum|g|gr|grams?|dwt)\b|กรัม|ทอง|โลหะ/
    },
    {
      role: "quantity",
      patterns: [/\b(qty|quantity|count|pcs|pieces?|nos|no of|number of)\b/, /จำนวน|เม็ด/]
    },
    { role: "size", patterns: [/\b(size|sizes|dimensions?|diameter|dia)\b/, /ขนาด/] },
    { role: "width", patterns: [/\bwidth\b/, /กว้าง/] },
    { role: "length", patterns: [/\blength\b/, /ยาว/] },
    { role: "shape", patterns: [/\bshape\b/, /\bcut\b/, /รูปทรง|ทรง|เจียระไน/] },
    {
      role: "stone",
      patterns: [
        /\b(material|gemstone|gem type|stone type)\b/,
        /\b(gems?|stones?)\b/,
        /\btype\b/,
        /\bname\b/,
        /\bdescription\b/,
        /ชนิด|พลอย|อัญมณี|เพชร/
      ]
    }
  ];

  const DESCRIPTIVE_ROLES = ["stone", "shape", "size", "width", "length"];
  const MEASURE_ROLES = ["quantity", "caratEach", "caratTotal", "carat", "size", "shape"];

  function cleanText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function normalizeHeader(value) {
    return cleanText(value)
      .toLowerCase()
      .replace(/[._()[\]{}/\\:#*|,;+-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // "DIAMOND" and "round" come out of different exporters; the product page
  // shows them as "Diamond" and "Round". Mixed case is left as typed.
  function tidyLabel(value) {
    const text = cleanText(value);

    if (!text || (text !== text.toUpperCase() && text !== text.toLowerCase())) {
      return text;
    }

    return text.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (match, lead, letter) => lead + letter.toUpperCase());
  }

  function round4(value) {
    return Math.round(value * 10000) / 10000;
  }

  // Matches formatGemCarat in app/lib/gem-report.js: two decimals where that
  // loses nothing, three otherwise, and up to four for melee under 0.1 ct.
  function formatCarat(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      return "";
    }

    const number = Number(value);

    if (number < 0.1) {
      return String(Number(number.toFixed(4)));
    }

    return Number(number.toFixed(2)) === Number(number.toFixed(3)) ? number.toFixed(2) : number.toFixed(3);
  }

  function readNumber(value) {
    const match = cleanText(value).replace(/\s/g, "").match(/\d+(?:[.,]\d+)?|[.,]\d+/);

    if (!match) {
      return null;
    }

    // Semicolon exports from comma-decimal locales write "0,005". Carats and
    // millimetres never need a thousands separator, so a comma is a decimal.
    const number = Number(match[0].replace(",", "."));
    return Number.isFinite(number) ? number : null;
  }

  function readQuantity(value) {
    const match = cleanText(value).match(/\d[\d,]*/);

    if (!match) {
      return null;
    }

    const quantity = Number.parseInt(match[0].replace(/,/g, ""), 10);
    return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
  }

  // "1.3", "1.30mm" and "6.5x4.5" all become "1.3 mm" / "6.5 × 4.5 mm"; any
  // other wording ("Pear 7x5", "1.3-1.5") is kept as the report wrote it.
  function formatSize(value) {
    const text = cleanText(value);

    if (!text) {
      return "";
    }

    if (/^[\d.,\s]+(?:[x×*]\s*[\d.,\s]+)*(?:mm)?$/i.test(text)) {
      const parts = text
        .replace(/mm$/i, "")
        .split(/[x×*]/i)
        .map((part) => part.trim().replace(",", "."))
        .filter(Boolean);

      return parts.length ? `${parts.join(" × ")} mm` : text;
    }

    return text;
  }

  function sizeFromDimensions(width, length) {
    const widthText = cleanText(width).replace(/mm$/i, "").trim();
    const lengthText = cleanText(length).replace(/mm$/i, "").trim();

    if (widthText && lengthText && readNumber(widthText) !== readNumber(lengthText)) {
      return formatSize(`${lengthText} x ${widthText}`);
    }

    return formatSize(widthText || lengthText);
  }

  function decodeGemReportBytes(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      return new TextDecoder("utf-16le").decode(bytes.subarray(2));
    }

    if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      return new TextDecoder("utf-16be").decode(bytes.subarray(2));
    }

    // Excel's "Unicode text" without a BOM still leaves every other byte zero
    // across an ASCII header.
    const sample = bytes.subarray(0, 200);
    let oddZeros = 0;
    for (let index = 1; index < sample.length; index += 2) {
      if (sample[index] === 0) oddZeros += 1;
    }
    if (sample.length > 8 && oddZeros > sample.length / 4) {
      return new TextDecoder("utf-16le").decode(bytes);
    }

    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      // A Thai Windows export that is not UTF-8 is almost always TIS-620.
      return new TextDecoder("windows-874").decode(bytes);
    }
  }

  // The delimiter is the one that shows up on the most lines, then the most
  // often: a comma-decimal file has commas only in its number cells, while its
  // semicolons run through the header too.
  function detectDelimiter(text) {
    const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim()).slice(0, 12);
    let best = { delimiter: ",", lines: 0, total: 0 };

    for (const delimiter of [",", ";", "\t", "|"]) {
      const counts = lines.map((line) => line.split(delimiter).length - 1);
      const score = {
        delimiter,
        lines: counts.filter((count) => count > 0).length,
        total: counts.reduce((sum, count) => sum + count, 0)
      };

      if (score.lines > best.lines || (score.lines === best.lines && score.total > best.total)) {
        best = score;
      }
    }

    return best.delimiter;
  }

  function parseDelimited(text, delimiter) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];

      if (inQuotes) {
        if (char === "\"" && text[index + 1] === "\"") {
          cell += "\"";
          index += 1;
        } else if (char === "\"") {
          inQuotes = false;
        } else {
          cell += char;
        }
      } else if (char === "\"" && !cell.trim()) {
        inQuotes = true;
        cell = "";
      } else if (char === delimiter) {
        row.push(cell);
        cell = "";
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && text[index + 1] === "\n") index += 1;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }

    if (cell || row.length) {
      row.push(cell);
      rows.push(row);
    }

    return rows.map((cells) => cells.map(cleanText));
  }

  function mapColumns(headerCells) {
    const headers = headerCells.map(normalizeHeader);
    const claimed = new Set();
    const columns = {};

    for (const { role, patterns, exclude } of COLUMN_ROLES) {
      for (const pattern of patterns) {
        const index = headers.findIndex((header, headerIndex) => (
          header
          && !claimed.has(headerIndex)
          && pattern.test(header)
          && !(exclude && exclude.test(header))
        ));

        if (index !== -1) {
          columns[role] = index;
          claimed.add(index);
          break;
        }
      }
    }

    return columns;
  }

  function findHeaderRow(rows) {
    let best = null;

    rows.slice(0, HEADER_SCAN_ROWS).forEach((cells, rowIndex) => {
      const columns = mapColumns(cells);
      const roles = Object.keys(columns);

      if (roles.length < 2 || !roles.some((role) => MEASURE_ROLES.includes(role))) {
        return;
      }

      if (!best || roles.length > Object.keys(best.columns).length) {
        best = { rowIndex, columns };
      }
    });

    return best;
  }

  // One carat column beside a quantity column can hold either the weight of
  // each stone or of the whole line. Round stones settle it: a round diamond
  // weighs about 0.0037 x diameter³ ct, so whichever reading lands closer to
  // that on most lines wins.
  function inferCaratMode(rawRows) {
    let eachVotes = 0;
    let totalVotes = 0;

    for (const row of rawRows) {
      const diameter = readNumber(row.size);

      if (!row.carat || !row.quantity || row.quantity < 2 || !diameter || (row.shape && !ROUND_SHAPE.test(row.shape))) {
        continue;
      }

      const expectedEach = 0.0037 * diameter ** 3;
      const asEach = Math.abs(Math.log(row.carat / expectedEach));
      const asTotal = Math.abs(Math.log(row.carat / row.quantity / expectedEach));

      if (asEach < asTotal) eachVotes += 1;
      if (asTotal < asEach) totalVotes += 1;
    }

    if (eachVotes > totalVotes) return { mode: "each", source: "sizes" };
    if (totalVotes > eachVotes) return { mode: "total", source: "sizes" };
    return { mode: "total", source: "default" };
  }

  function groupStones(rows) {
    const groups = new Map();

    for (const row of rows) {
      const key = [row.stone, row.shape, row.size].map((part) => part.toLowerCase()).join("|");
      const group = groups.get(key);

      if (!group) {
        groups.set(key, { ...row, eachValues: row.caratEach === null ? [] : [row.caratEach] });
        continue;
      }

      group.quantity += row.quantity;
      group.caratTotal = group.caratTotal === null || row.caratTotal === null
        ? null
        : round4(group.caratTotal + row.caratTotal);
      if (row.caratEach !== null) group.eachValues.push(row.caratEach);
    }

    return Array.from(groups.values()).map(({ eachValues, ...stone }) => {
      const consistent = eachValues.length > 0
        && eachValues.every((value) => Math.abs(value - eachValues[0]) < 0.0005);

      return { ...stone, caratEach: consistent ? eachValues[0] : null };
    });
  }

  function stoneSortWeight(stone) {
    if (stone.caratEach !== null) return stone.caratEach;
    if (stone.caratTotal !== null && stone.quantity) return stone.caratTotal / stone.quantity;
    return readNumber(stone.size) || 0;
  }

  // The short specs the product page already shows: the whole piece's carat
  // weight, the stones it holds, and the shape of its largest stone.
  function summarizeGemReport(report) {
    const stones = Array.isArray(report?.stones) ? report.stones : [];
    const specs = {};

    if (report?.totalCarat !== null && report?.totalCarat !== undefined) {
      const isSingleStone = stones.length === 1 && stones[0].quantity === 1;
      specs.caratWeight = `${formatCarat(report.totalCarat)} ct${isSingleStone ? "" : " total"}`;
    }

    const stoneTypes = Array.from(new Set(stones.map((stone) => stone.stone).filter(Boolean)));
    if (stoneTypes.length) {
      specs.stoneType = stoneTypes.slice(0, 3).join(" & ");
    }

    const leadShape = stones.find((stone) => stone.shape)?.shape;
    if (leadShape) {
      specs.stoneShape = leadShape;
    }

    return specs;
  }

  function parseGemReportCsv(text, options = {}) {
    const source = String(text || "").replace(/^﻿/, "");
    const rows = parseDelimited(source, detectDelimiter(source)).filter((cells) => cells.some(Boolean));
    const header = findHeaderRow(rows);

    if (!header) {
      return {
        ok: false,
        error: "No gem columns found. The report needs a header row naming at least two of: Stone or Gem, Shape or Cut, Size, Qty, Carat or Weight."
      };
    }

    const { columns } = header;
    const hasDescriptiveColumn = DESCRIPTIVE_ROLES.some((role) => columns[role] !== undefined);
    const cell = (cells, role) => (columns[role] === undefined ? "" : cells[columns[role]] || "");
    const rawRows = [];
    let skippedRows = 0;

    for (const cells of rows.slice(header.rowIndex + 1)) {
      if (cells.some((value) => TOTAL_ROW.test(value))) {
        skippedRows += 1;
        continue;
      }

      const stone = tidyLabel(cell(cells, "stone"));
      const shape = tidyLabel(cell(cells, "shape"));
      const size = columns.size !== undefined
        ? formatSize(cell(cells, "size"))
        : sizeFromDimensions(cell(cells, "width"), cell(cells, "length"));
      const quantity = readQuantity(cell(cells, "quantity"));
      const caratEach = readNumber(cell(cells, "caratEach"));
      const caratTotal = readNumber(cell(cells, "caratTotal"));
      const carat = readNumber(cell(cells, "carat"));
      const isDescribed = Boolean(stone || shape || size);

      // An unlabelled line of numbers under a described table is a total, and
      // a line with no number at all is a note or a repeated header.
      if ((hasDescriptiveColumn && !isDescribed) || (quantity === null && caratEach === null && caratTotal === null && carat === null && !size)) {
        skippedRows += 1;
        continue;
      }

      rawRows.push({ stone, shape, size, quantity, caratEach, caratTotal, carat });
    }

    const hasBothCaratColumns = columns.caratEach !== undefined && columns.caratTotal !== undefined;
    // Only a lone carat column is a guess, and only where some line holds
    // more than one stone; the admin can then say which reading is right.
    const needsCaratMode = columns.carat !== undefined
      && columns.caratEach === undefined
      && columns.caratTotal === undefined
      && rawRows.some((row) => (row.quantity || 1) > 1);
    let caratMode = null;
    let caratModeSource = null;

    if (columns.carat !== undefined && !hasBothCaratColumns) {
      if (columns.caratTotal !== undefined) {
        caratMode = "each";
        caratModeSource = "header";
      } else if (columns.caratEach !== undefined) {
        caratMode = "total";
        caratModeSource = "header";
      } else if (options.caratMode === "each" || options.caratMode === "total") {
        caratMode = options.caratMode;
        caratModeSource = "admin";
      } else {
        const inferred = inferCaratMode(rawRows);
        caratMode = inferred.mode;
        caratModeSource = inferred.source;
      }
    }

    const stoneRows = rawRows.map((row) => {
      const quantity = row.quantity || 1;
      let caratEach = row.caratEach;
      let caratTotal = row.caratTotal;

      if (row.carat !== null && caratMode === "each" && caratEach === null) caratEach = row.carat;
      if (row.carat !== null && caratMode === "total" && caratTotal === null) caratTotal = row.carat;
      if (caratTotal === null && caratEach !== null) caratTotal = round4(caratEach * quantity);
      if (caratEach === null && caratTotal !== null) caratEach = round4(caratTotal / quantity);

      return {
        stone: row.stone,
        shape: row.shape,
        size: row.size,
        quantity,
        caratEach: caratEach === null ? null : round4(caratEach),
        caratTotal: caratTotal === null ? null : round4(caratTotal)
      };
    });

    const grouped = groupStones(stoneRows);
    const stones = grouped
      .map((stone, index) => ({ stone, index }))
      .sort((left, right) => (stoneSortWeight(right.stone) - stoneSortWeight(left.stone)) || (left.index - right.index))
      .map(({ stone }) => stone)
      .slice(0, MAX_STONE_ROWS);

    if (!stones.length) {
      return {
        ok: false,
        error: "The gem columns were found, but no stone rows were under them."
      };
    }

    const carats = stones.map((stone) => stone.caratTotal).filter((value) => value !== null);
    const report = {
      stones,
      totalQuantity: stones.reduce((sum, stone) => sum + stone.quantity, 0),
      totalCarat: carats.length ? round4(carats.reduce((sum, value) => sum + value, 0)) : null,
      fileName: cleanText(options.fileName).slice(0, 160)
    };
    const headerCells = rows[header.rowIndex];

    return {
      ok: true,
      report,
      specs: summarizeGemReport(report),
      columns: Object.fromEntries(Object.entries(columns).map(([role, index]) => [role, headerCells[index]])),
      caratMode,
      caratModeSource,
      needsCaratMode,
      skippedRows,
      truncated: grouped.length > MAX_STONE_ROWS
    };
  }

  root.MARIS_ADMIN_GEM_REPORT = {
    decodeGemReportBytes,
    formatCarat,
    parseGemReportCsv,
    summarizeGemReport
  };
})(typeof window !== "undefined" ? window : globalThis);
