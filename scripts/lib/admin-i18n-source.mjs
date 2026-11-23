// Helpers for tests that read the admin's source files and assert on what the
// admin says. The wording now lives in app/lib/admin-i18n.js, so a source file
// holds t("key") calls instead of English sentences. expandAdminI18n() puts the
// English value of every t("key") / tp("key", n) call back into the source text,
// which lets a test keep checking the English copy it always checked.
import { readFile } from "node:fs/promises";
import { en } from "../../app/lib/admin-i18n.js";

function skipQuoted(source, index) {
  const quote = source[index];
  let i = index + 1;

  while (i < source.length) {
    if (source[i] === "\\") {
      i += 2;
      continue;
    }

    if (quote === "`" && source[i] === "$" && source[i + 1] === "{") {
      i = skipBalanced(source, i + 1, "{", "}");
      continue;
    }

    if (source[i] === quote) {
      return i + 1;
    }

    i += 1;
  }

  return i;
}

// index points at the opening bracket; returns the index after its partner.
function skipBalanced(source, index, open, close) {
  let depth = 0;
  let i = index;

  while (i < source.length) {
    const char = source[i];

    if (char === '"' || char === "'" || char === "`") {
      i = skipQuoted(source, i);
      continue;
    }

    if (char === open) depth += 1;
    if (char === close) {
      depth -= 1;
      if (depth === 0) return i + 1;
    }

    i += 1;
  }

  return i;
}

export function adminEnglish(key, plural = false) {
  return plural ? (en[`${key}.other`] ?? en[key]) : en[key];
}

export function expandAdminI18n(source) {
  const callPattern = /(?<![\w$.])(tp?)\(\s*(["'])([^"'\n]+)\2/g;
  const inTemplateEscape = /\$\{escapeHtml\("((?:[^"\\]|\\.)*)"\)\}/g;
  const inTemplatePlain = /\$\{"((?:[^"\\]|\\.)*)"\}/g;
  let result = "";
  let cursor = 0;
  let match;

  while ((match = callPattern.exec(source))) {
    const [head, fn, , key] = match;
    const text = adminEnglish(key, fn === "tp");

    if (text === undefined) {
      continue;
    }

    const open = match.index + head.indexOf("(");
    const end = skipBalanced(source, open, "(", ")");
    let start = match.index;
    let stop = end;
    let replacement = JSON.stringify(text);

    // {t("key")} inside JSX is plain text; attr={t("key")} is attr="text".
    const before = source.slice(0, start).match(/\{\s*$/);
    const after = source.slice(end).match(/^\s*\}/);

    if (before && after) {
      start -= before[0].length;
      stop += after[0].length;
      replacement = /=\s*$/.test(source.slice(0, start)) ? JSON.stringify(text) : text;
    }

    result += source.slice(cursor, start) + replacement;
    cursor = stop;
    callPattern.lastIndex = stop;
  }

  result += source.slice(cursor);

  // ${escapeHtml("text")} and ${"text"} are just text in a template.
  return result
    .replace(inTemplateEscape, (_, text) => JSON.parse(`"${text}"`))
    .replace(inTemplatePlain, (_, text) => JSON.parse(`"${text}"`));
}

export async function readAdminSource(relativePath) {
  const source = await readFile(new URL(`../../${relativePath}`, import.meta.url), "utf8");
  return expandAdminI18n(source);
}
