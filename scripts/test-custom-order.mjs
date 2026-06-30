import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const migrationFiles = await readdir(new URL("../supabase/migrations/", import.meta.url));
const customOrderMigrationFile = migrationFiles.find((fileName) => fileName.endsWith("_create_custom_order_requests.sql"));
assert.ok(customOrderMigrationFile, "A Supabase migration should create custom_order_requests");

const migration = await readFile(new URL(`../supabase/migrations/${customOrderMigrationFile}`, import.meta.url), "utf8");
assert.match(migration, /create table if not exists public\.custom_order_requests\b/i);
assert.match(migration, /customer_id uuid references public\.customers\(id\) on delete set null/i);
assert.match(migration, /ring_size numeric\(4,\s*1\)/i);
assert.match(migration, /ring_size \* 2 = floor\(ring_size \* 2\)/i);
assert.match(migration, /exact numeric/i, "Migration should document why ring_size stays numeric, not float");
assert.match(migration, /status text not null default 'pending'/i);
assert.match(migration, /status in \('pending', 'contacted', 'completed', 'cancelled'\)/i);
assert.match(migration, /alter table public\.custom_order_requests\s+enable row level security/i);

const customOrderPolicyBlocks = migration
  .match(/create\s+policy[\s\S]*?;/gi)
  ?.filter((policy) => /on\s+public\.custom_order_requests\b/i.test(policy)) || [];
assert.deepEqual(
  customOrderPolicyBlocks,
  [],
  "Custom order requests should stay server-only and should not add browser RLS policies"
);
assert.doesNotMatch(
  migration,
  /grant\s+insert\s+on\s+(?:table\s+)?public\.custom_order_requests\s+to\s+(?:anon|public)\b/i,
  "Custom order requests should not grant anon/public insert access"
);

assert.match(migration, /add column if not exists full_name text/i, "Migration should make customers.full_name explicit for lead linking");
assert.match(migration, /information_schema\.columns/i, "Migration should guard legacy customers.name compatibility checks");

for (const indexName of [
  "idx_custom_order_requests_customer_id",
  "idx_custom_order_requests_email",
  "idx_custom_order_requests_product_code",
  "idx_custom_order_requests_status_created_at"
]) {
  assert.match(migration, new RegExp(`create index if not exists ${indexName}\\b`, "i"), `Migration should include ${indexName}`);
}

const envExample = await readFile(new URL("../.env.example", import.meta.url), "utf8");
assert.match(envExample, /^MARIS_ORDER_EMAIL_TO=/m, ".env.example should document MARIS_ORDER_EMAIL_TO");

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.equal(packageJson.scripts["test:custom-order"], "node scripts/test-custom-order.mjs");

const databaseLib = await readFile(new URL("../app/lib/maris-database.js", import.meta.url), "utf8");
assert.match(databaseLib, /"custom_order_requests"/, "Database table status contract should include custom_order_requests");

const databaseTest = await readFile(new URL("../scripts/test-supabase-admin-database.mjs", import.meta.url), "utf8");
assert.match(databaseTest, /"custom_order_requests"/, "Database schema test should expect custom_order_requests");
