import { readFile } from "node:fs/promises";

import {
  MARIS_DATABASE_TABLES,
  getSupabaseAdminConfig,
  readAdminDatabaseStatus
} from "../app/lib/maris-database.js";

async function loadLocalEnv(fileName) {
  let fileBody = "";

  try {
    fileBody = await readFile(new URL(`../${fileName}`, import.meta.url), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return;
    }

    throw error;
  }

  for (const rawLine of fileBody.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

await loadLocalEnv(".env.local");
await loadLocalEnv(".env");

const config = getSupabaseAdminConfig();

if (!config.isConfigured) {
  console.error(`Missing ${config.missingEnv.join(" and ")}. Add them to .env.local or the shell before running this live check.`);
  process.exit(1);
}

const status = await readAdminDatabaseStatus();
const unreachableTables = status.tables.filter((table) => !table.isReachable);

if (unreachableTables.length > 0) {
  console.error("Supabase admin database is configured, but some expected tables are unreachable:");

  for (const table of unreachableTables) {
    console.error(`- ${table.name}: ${table.error || "unknown error"}`);
  }

  process.exit(1);
}

if (status.tables.length !== MARIS_DATABASE_TABLES.length) {
  console.error(`Expected ${MARIS_DATABASE_TABLES.length} tables, got ${status.tables.length}.`);
  process.exit(1);
}

console.log(`Supabase admin database reachable for project ${status.projectRef || "(unknown project)"}.`);

for (const table of status.tables) {
  const countLabel = typeof table.rowCount === "number" ? `${table.rowCount} rows` : "row count unavailable";
  console.log(`- ${table.name}: ${countLabel}`);
}
