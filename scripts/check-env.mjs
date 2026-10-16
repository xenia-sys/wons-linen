import { existsSync, readFileSync } from 'node:fs';
const values = { ...process.env };
for (const path of ['.env.local', '.env.development.local']) {
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
}
const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'].filter(key => !values[key]);
if (missing.length) { console.error(`Setup pending. Missing environment keys: ${missing.join(', ')}`); process.exit(1); }
if (!URL.canParse(values.NEXT_PUBLIC_SUPABASE_URL) || !values.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')) { console.error('Invalid NEXT_PUBLIC_SUPABASE_URL.'); process.exit(1); }
console.log('Required public environment keys are present. Secret values were not printed.');
