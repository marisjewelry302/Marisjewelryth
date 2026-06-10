import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');

// Load environment variables from .env.local
const env = {};
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split(/\r?\n/).forEach((line) => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)$/);
  if (!m) return;
  let val = m[2];
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  env[m[1]] = val;
});

// Try using pg module if available, otherwise try manual HTTP
let success = false;

// Try pg module
try {
  const pg = await import('pg');
  const { Client } = pg.default;
  
  // Extract connection string from SUPABASE_URL
  const supabaseUrl = env.SUPABASE_URL;
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const connectionString = `postgres://postgres:${env.SUPABASE_SERVICE_ROLE_KEY}@${projectRef}.supabase.co:5432/postgres`;
  
  const client = new Client({ connectionString });
  
  console.log('Connecting to Supabase PostgreSQL...');
  await client.connect();
  
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/20260608000000_add_username_password_to_admin_users.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('Applying migration: add_username_password_to_admin_users');
  console.log('---');
  
  const result = await client.query(migrationSQL);
  console.log('✓ Migration applied successfully');
  console.log(result);
  
  await client.end();
  success = true;
} catch (err) {
  console.log('Note: Could not execute SQL directly. Use Supabase SQL Editor instead:');
  console.log('1. Go to https://supabase.com/dashboard/project/qhwhkirazohcgrtaefoh/sql/');
  console.log('2. Create a new query');
  console.log('3. Copy and paste the migration file content');
  console.log('4. Click Run');
  console.log('\nMigration file location:');
  console.log(path.resolve(__dirname, '../supabase/migrations/20260608000000_add_username_password_to_admin_users.sql'));
}
