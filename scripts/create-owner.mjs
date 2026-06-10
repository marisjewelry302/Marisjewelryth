import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInitialAdminUser } from '../app/lib/admin-users.js';

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

const result = await createInitialAdminUser({
  username: 'Raparis',
  displayName: 'Raparis',
  password: 'Marisjelly'
});

console.log('CREATE RESULT:', JSON.stringify(result, null, 2));

if (result.status === 'created') {
  console.log(`✓ Owner account created successfully`);
  console.log(`  Username: ${result.user.username}`);
  console.log(`  Display Name: ${result.user.displayName}`);
  console.log(`  Role: ${result.user.role}`);
} else {
  console.log(`✗ Failed to create owner: ${result.status}`);
}
