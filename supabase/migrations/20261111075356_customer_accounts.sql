-- WONS shopping accounts. No new staff permissions, orders, or checkout writes.
-- Verify the requesting identity without exposing the Auth schema or trusting
-- user-editable metadata. This function is private and only returns one's own ID.
create function private.customer_session_uid()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select u.id
  from auth.users u
  join auth.sessions s on s.user_id = u.id
    and s.id::text = (select auth.jwt()->>'session_id')
  where u.id = (select auth.uid())
    and u.email_confirmed_at is not null
    and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false'
    and (s.not_after is null or s.not_after > now())
$$;
revoke all on function private.customer_session_uid() from public, anon, authenticated;
grant execute on function private.customer_session_uid() to authenticated;

create table public.customer_addresses (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('shipping', 'billing')),
  recipient text not null check (char_length(btrim(recipient)) between 1 and 100),
  line1 text not null check (char_length(btrim(line1)) between 1 and 180),
  line2 text not null default '' check (char_length(line2) <= 180),
  city text not null check (char_length(btrim(city)) between 1 and 100),
  region text not null default '' check (char_length(region) <= 100),
  postal_code text not null default '' check (char_length(postal_code) <= 24),
  country text not null check (char_length(btrim(country)) between 1 and 100),
  primary key (user_id, kind),
  check (char_length(recipient) <= 100 and char_length(line1) <= 180
    and char_length(city) <= 100 and char_length(country) <= 100)
);
alter table public.customer_addresses enable row level security;
revoke all on public.customer_addresses from public, anon, authenticated;
grant select, insert, update, delete on public.customer_addresses to authenticated;
create policy "Customers read own addresses" on public.customer_addresses
  for select to authenticated using (user_id = (select private.customer_session_uid()));
create policy "Customers save own addresses" on public.customer_addresses
  for insert to authenticated with check (user_id = (select private.customer_session_uid()));
create policy "Customers edit own addresses" on public.customer_addresses
  for update to authenticated
  using (user_id = (select private.customer_session_uid()))
  with check (user_id = (select private.customer_session_uid()));
create policy "Customers remove own addresses" on public.customer_addresses
  for delete to authenticated using (user_id = (select private.customer_session_uid()));

-- A read-only account projection. Only the future trusted order workflow may
-- write it. Guest orders need no account; do not attach them by email matching.
create table public.customer_order_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  order_number text not null unique check (order_number ~ '^[A-Za-z0-9-]{1,48}$'),
  placed_at timestamptz not null default now(),
  status text not null check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded')),
  total_vnd bigint not null check (total_vnd between 0 and 9007199254740991)
);
create index customer_orders_user_placed_idx on public.customer_order_summaries (user_id, placed_at desc);
alter table public.customer_order_summaries enable row level security;
revoke all on public.customer_order_summaries from public, anon, authenticated;
grant select on public.customer_order_summaries to authenticated;
create policy "Customers read own order summaries" on public.customer_order_summaries
  for select to authenticated using (user_id = (select private.customer_session_uid()));
