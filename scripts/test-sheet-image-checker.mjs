import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { checkSheetImages } from "./lib/sheet-image-checker.mjs";

async function withTempProject(callback) {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "maris-sheet-images-"));

  try {
    await mkdir(path.join(projectRoot, "assets", "images", "catalogue"), { recursive: true });
    await writeFile(path.join(projectRoot, "assets", "images", "catalogue", "exact.png"), "png");
    await writeFile(path.join(projectRoot, "assets", "images", "catalogue", "case-real.png"), "png");
    await writeFile(path.join(projectRoot, "assets", "images", "catalogue", "side.PNG"), "png");
    return await callback(projectRoot);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}

await withTempProject(async (projectRoot) => {
  const requestedUrls = [];
  const csvText = [
    "Internal note",
    [
      "name",
      "code",
      "image_url",
      "front_image_url",
      "hover_image_url",
      "gallery"
    ].join(","),
    [
      "Checked Ring",
      "ER101",
      "assets/images/catalogue/exact.png",
      "assets/images/catalogue/Case-Real.png",
      "https://cdn.example.test/missing.png",
      "\"Side View | assets/images/catalogue/side.PNG | Side alt\nMissing View | assets/images/catalogue/nope.png | Missing alt\""
    ].join(",")
  ].join("\n");

  const report = await checkSheetImages({
    csvText,
    projectRoot,
    fetchFn: async (url) => {
      requestedUrls.push(String(url));
      return {
        ok: false,
        status: 404,
        headers: new Map([["content-type", "text/html"]])
      };
    }
  });

  assert.equal(report.summary.rowsChecked, 1);
  assert.equal(report.summary.imageReferencesChecked, 5);
  assert.equal(report.summary.localImagesChecked, 4);
  assert.equal(report.summary.remoteImagesChecked, 1);
  assert.equal(report.ok, false);

  assert.ok(report.issues.some((issue) => issue.type === "case-mismatch" && issue.value === "assets/images/catalogue/Case-Real.png"));
  assert.ok(report.issues.some((issue) => issue.type === "missing-local-file" && issue.value === "assets/images/catalogue/nope.png"));
  assert.ok(report.issues.some((issue) => issue.type === "url-unreachable" && issue.status === 404));
  assert.deepEqual(requestedUrls, ["https://cdn.example.test/missing.png"]);
});

await withTempProject(async (projectRoot) => {
  const requestedUrls = [];
  const csvText = [
    "code,name,image_url,front_image_url",
    "ER102,Drive Ring,https://drive.google.com/file/d/drive-file-id/view,side.PNG"
  ].join("\n");

  const report = await checkSheetImages({
    csvText,
    projectRoot,
    fetchFn: async (url) => {
      requestedUrls.push(String(url));
      return {
        ok: true,
        status: 200,
        headers: new Map([["content-type", "image/jpeg"]])
      };
    }
  });

  assert.equal(report.ok, true);
  assert.equal(report.summary.imageReferencesChecked, 2);
  assert.equal(report.summary.localImagesChecked, 1);
  assert.equal(report.summary.remoteImagesChecked, 1);
  assert.deepEqual(requestedUrls, ["https://drive.google.com/thumbnail?id=drive-file-id&sz=w1600"]);
});

console.log("Sheet image checker tests passed.");
