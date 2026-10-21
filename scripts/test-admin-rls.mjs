// Isolated PostgreSQL only: never connects to a hosted project or reads .env files.
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
const db = new PGlite();
try {
  // Minimal Supabase platform contracts. Real Auth/email and Storage HTTP delivery
  // remain separate acceptance checks; these fixtures exercise SQL/RLS/triggers.
  await db.exec(`
    create role anon;
    create role authenticated;
    grant usage on schema public to anon, authenticated;
    create schema auth;
    create table auth.users(id uuid primary key, aud text, role text, email text,
      email_confirmed_at timestamptz, created_at timestamptz, updated_at timestamptz);
    create table auth.sessions(id uuid primary key, user_id uuid references auth.users,
      created_at timestamptz, updated_at timestamptz, not_after timestamptz);
    create function auth.jwt() returns jsonb language sql stable as
      $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create function auth.uid() returns uuid language sql stable as
      $$select (auth.jwt()->>'sub')::uuid$$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.jwt(),auth.uid() to anon,authenticated;
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean,
      file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),
      bucket_id text references storage.buckets, name text, metadata jsonb,
      unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated;
    grant select,insert,update,delete on storage.objects to anon,authenticated;
  `);
  const migrations = await readdir(
    new URL("../supabase/migrations/", import.meta.url),
  );
  for (const name of migrations
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    await db.exec(
      await readFile(
        new URL(`../supabase/migrations/${name}`, import.meta.url),
        "utf8",
      ),
    );
  }
  const results = await db.exec(
    await readFile(
      new URL("../supabase/tests/product_admin.sql", import.meta.url),
      "utf8",
    ),
  );
  for (const result of results)
    for (const row of result.rows) if (row.result) console.log(row.result);
  const {
    rows: [counts],
  } = await db.query(`select
    (select count(*)::integer from public.products) as products,
    (select count(*)::integer from public.variants) as variants,
    (select count(*)::integer from auth.users) as auth_users,
    (select count(*)::integer from public.staff_members) as staff`);
  if (
    counts.products !== 6 ||
    counts.variants !== 42 ||
    counts.auth_users !== 0 ||
    counts.staff !== 0
  )
    throw Error("Fixtures did not roll back.");
  console.log(
    "PASS: isolated fixtures rolled back; original 6 products / 42 variants intact.",
  );
} catch (error) {
  console.error(
    `Isolated RLS test failed: ${error.message} (${error.code ?? "no code"})`,
  );
  process.exitCode = 1;
} finally {
  await db.close();
}
