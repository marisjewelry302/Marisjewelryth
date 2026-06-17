import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8")
);
const deployGuide = await readFile(new URL("../DEPLOY.md", import.meta.url), "utf8");
const googleSheetGuide = await readFile(new URL("../docs/google-sheet-catalogue.md", import.meta.url), "utf8");

assert.equal(
  packageJson.scripts.prebuild,
  undefined,
  "Vercel build must not run the retired legacy public sync"
);

assert.doesNotMatch(
  JSON.stringify(packageJson.scripts),
  /prebuild.*check:sheet-images|prebuild.*check-sheet-images/,
  "Vercel build must not be blocked by the manual Google Sheet image checker"
);

assert.doesNotMatch(
  JSON.stringify(packageJson.scripts),
  /sync-legacy-public|sync:legacy|predev/,
  "Development and build scripts must not recreate legacy static public files"
);

assert.match(
  deployGuide,
  /npm run check:sheet-images.*manual diagnostic/is,
  "Deploy guide must describe the sheet image checker as manual, not an automatic build gate"
);

assert.doesNotMatch(
  deployGuide,
  /scripts\/sync-legacy-public|root `index\.html`, `pages\/`, and `assets\/` folders|build`?\s+which calls it automatically|build.*runs.*check:sheet-images.*automatically/is,
  "Deploy guide must not describe the retired legacy public sync or automatic sheet checker"
);

assert.doesNotMatch(
  googleSheetGuide,
  /npm run build.*runs this check automatically/is,
  "Google Sheet guide must not say npm run build automatically runs the sheet image checker"
);
