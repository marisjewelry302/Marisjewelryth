// Runs every scripts/test-*.mjs file, one after another, and exits non-zero if any fails.
//
//   npm run test:all                run everything
//   npm run test:all -- popup hero  run only the scripts whose name contains one of the words
//
// Scripts ending in "-live.mjs" talk to a real Supabase project and need real credentials,
// so they are skipped here; run them yourself with `npm run test:database:live`.
// The Supabase variables are removed from the environment each script sees, so a run on a
// developer machine behaves like a run in CI and can never touch a real database.
import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SCRIPTS_DIR = fileURLToPath(new URL("./", import.meta.url));
const TIMEOUT_MS = 120_000;
const OUTPUT_TAIL_LINES = 25;
const STRIPPED_ENV = ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

const filters = process.argv.slice(2).map((word) => word.toLowerCase());
const allScripts = (await readdir(SCRIPTS_DIR))
  .filter((name) => /^test-.+\.mjs$/.test(name))
  .sort();
const liveScripts = allScripts.filter((name) => name.endsWith("-live.mjs"));
const candidates = allScripts.filter((name) => !liveScripts.includes(name));
const selected = filters.length
  ? candidates.filter((name) => filters.some((word) => name.toLowerCase().includes(word)))
  : candidates;

if (selected.length === 0) {
  console.error(`No test scripts match: ${filters.join(", ")}`);
  process.exit(1);
}

const env = { ...process.env };
for (const key of STRIPPED_ENV) {
  delete env[key];
}

function runScript(name) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(process.execPath, [`scripts/${name}`], {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, TIMEOUT_MS);

    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ name, code: timedOut ? "timeout" : code, output, ms: Date.now() - startedAt });
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ name, code: "spawn-error", output: String(error), ms: Date.now() - startedAt });
    });
  });
}

const failures = [];

for (const name of selected) {
  const result = await runScript(name);
  const passed = result.code === 0;
  console.log(`${passed ? "PASS" : "FAIL"}  ${name.padEnd(54)} ${(result.ms / 1000).toFixed(1)}s`);

  if (!passed) {
    failures.push(result);
    const tail = result.output.trimEnd().split("\n").slice(-OUTPUT_TAIL_LINES).join("\n");
    console.log(`\n--- ${name} (exit: ${result.code}) ---\n${tail}\n--- end ---\n`);
  }
}

const skipped = filters.length ? [] : liveScripts;
console.log(`\n${selected.length - failures.length} passed, ${failures.length} failed, ${skipped.length} skipped${skipped.length ? ` (${skipped.join(", ")}: need real Supabase credentials)` : ""}`);

if (failures.length > 0) {
  console.log(`Failed: ${failures.map((result) => result.name).join(", ")}`);
  process.exit(1);
}
