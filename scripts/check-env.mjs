import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const env = {};

try {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)$/);
    if (!m) return;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[m[1]] = val;
  });
} catch (e) {
  // ignore
}

console.log(env.SUPABASE_URL ?? null);
console.log(!!env.SUPABASE_SERVICE_ROLE_KEY);
console.log(!!env.MARIS_ADMIN_SESSION_SECRET);
