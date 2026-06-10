import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSupabaseAdminClient, getSupabaseAdminConfig } from '../app/lib/maris-database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');

// Load environment variables from .env.local
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split(/\r?\n/).forEach((line) => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)$/);
  if (!m) return;
  let val = m[2];
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  process.env[m[1]] = val;
});

const supabase = createSupabaseAdminClient();

// Query existing admin users with all columns
const { data, error } = await supabase
  .from('admin_users')
  .select('*');

if (error) {
  console.error('Error fetching admin users:', error);
} else {
  console.log('Existing admin users in Supabase:');
  console.table(data);
}
