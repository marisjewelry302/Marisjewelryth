import { readFileSync } from "node:fs";

const cssPath = "assets/css/style.css";
const css = readFileSync(cssPath, "utf8");

const overlayBlocks = [...css.matchAll(/\.atelier-product::after\s*\{(?<body>[\s\S]*?)\n\}/g)]
  .map((match) => match.groups.body);

if (overlayBlocks.length === 0) {
  throw new Error("Expected .atelier-product::after overlay styles to exist.");
}

const greenOverlayTokens = [
  "rgba(0, 54, 43",
  "rgba(0, 73, 58"
];

overlayBlocks.forEach((block, index) => {
  for (const token of greenOverlayTokens) {
    if (block.includes(token)) {
      throw new Error(`Atelier product overlay block ${index + 1} still uses green tint token: ${token}`);
    }
  }
});

const finalOverlayBlock = overlayBlocks.at(-1);
const requiredWarmTokens = [
  "rgba(24, 18, 15",
  "rgba(255, 250, 246"
];

for (const token of requiredWarmTokens) {
  if (!finalOverlayBlock.includes(token)) {
    throw new Error(`Expected final atelier overlay to use warm neutral token: ${token}`);
  }
}

console.log("Atelier product overlay tint is neutral.");
