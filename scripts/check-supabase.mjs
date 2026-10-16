import { readFileSync, existsSync } from 'node:fs';
const values = { ...process.env };
for (const file of ['.env.local', '.env.development.local']) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) values[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
  }
}
const url = values.NEXT_PUBLIC_SUPABASE_URL;
const key = values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Missing public Supabase configuration.');
const response = await fetch(new URL('/auth/v1/settings', url), { headers: { apikey: key }, signal: AbortSignal.timeout(15000) });
if (!response.ok) throw new Error(`Supabase public API verification failed: HTTP ${response.status}`);
console.log(`WONS Supabase public Auth settings endpoint verified: HTTP ${response.status}. No credentials printed or database rows written.`);
