import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashAdminPassword } from '../app/lib/admin-auth.js';
import { createSupabaseAdminClient } from '../app/lib/maris-database.js';

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

const username = 'Raparis';
const password = 'Marisjelly';
const displayName = 'Raparis';
const email = 'raparis@maris-jewelry.local'; // Local email for Raparis Owner

// Hash the password
const passwordHash = hashAdminPassword(password);

// Insert into admin_users table
const { data, error } = await supabase
  .from('admin_users')
  .insert({
    username: username.toLowerCase(),
    display_name: displayName,
    password_hash: passwordHash,
    email: email,
    role: 'owner'
  })
  .select('*')
  .single();

if (error) {
  console.error('❌ Error creating admin user:', error.message || error);
  process.exit(1);
} else {
  console.log('✓ Owner account created successfully');
  console.log(`  Username: ${data.username}`);
  console.log(`  Display Name: ${data.display_name}`);
  console.log(`  Role: ${data.role}`);
  console.log(`  ID: ${data.id}`);
}
