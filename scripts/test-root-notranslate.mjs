import { readFile } from "node:fs/promises";

const layoutSource = await readFile("app/layout.js", "utf8");

function assertIncludes(pattern, message) {
  if (!pattern.test(layoutSource)) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

assertIncludes(
  /<html\s+[^>]*lang="en"[^>]*translate="no"[^>]*className="notranslate"[^>]*>/,
  "Root html must opt out of browser translation before hydration."
);

assertIncludes(
  /<meta\s+name="google"\s+content="notranslate"\s*\/>/,
  "Head must include the Google notranslate meta tag."
);

assertIncludes(
  /<body\s+[^>]*className="[^"]*\bnotranslate\b[^"]*"[^>]*translate="no"[^>]*>/,
  "Body must carry notranslate and translate=\"no\"."
);

console.log("PASS: Root document opts out of browser translation.");
