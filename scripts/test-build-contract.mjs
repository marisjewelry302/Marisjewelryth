import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8")
);
const deployGuide = await readFile(new URL("../DEPLOY.md", import.meta.url), "utf8");
const googleSheetGuide = await readFile(new URL("../docs/google-sheet-catalogue.md", import.meta.url), "utf8");

assert.equal(
  packageJson.scripts.prebuild,
  "node scripts/sync-legacy-public.mjs",
  "Vercel prebuild must only sync legacy public assets; sheet image validation is a manual diagnostic"
);

assert.doesNotMatch(
  packageJson.scripts.prebuild,
  /check:sheet-images|check-sheet-images/,
  "Vercel build must not be blocked by the manual Google Sheet image checker"
);

assert.match(
  deployGuide,
  /npm run check:sheet-images.*manual diagnostic/is,
  "Deploy guide must describe the sheet image checker as manual, not an automatic build gate"
);

assert.doesNotMatch(
  deployGuide,
  /build`?\s+which calls it automatically|build.*runs.*check:sheet-images.*automatically/is,
  "Deploy guide must not say npm run build automatically runs the sheet image checker"
);

assert.doesNotMatch(
  googleSheetGuide,
  /npm run build.*runs this check automatically/is,
  "Google Sheet guide must not say npm run build automatically runs the sheet image checker"
);
