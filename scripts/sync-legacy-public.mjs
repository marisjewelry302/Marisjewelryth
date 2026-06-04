import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(projectRoot, "public");

const rootFiles = [
  "index.html",
  "404.html",
  "manifest.webmanifest",
  "robots.txt",
  "sitemap.xml"
];

const rootDirs = ["assets", "pages"];

const excludedPrefixes = [
  "assets/images/home/archive/",
  "pages/admin.html"
];

function toRelativePosix(filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, "/");
}

function shouldCopy(sourcePath) {
  const relPath = toRelativePosix(sourcePath);
  return !excludedPrefixes.some((prefix) => relPath === prefix.slice(0, -1) || relPath.startsWith(prefix));
}

await rm(publicDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });

for (const file of rootFiles) {
  await cp(path.join(projectRoot, file), path.join(publicDir, file));
}

for (const dir of rootDirs) {
  await cp(path.join(projectRoot, dir), path.join(publicDir, dir), {
    recursive: true,
    filter: shouldCopy
  });
}

console.log("Synced legacy static site into public/ for Next.js.");
