-- Scheduled percentage discounts on selected WONS products.
create table public.discount_events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 100),
  percent_off integer not null check (percent_off between 1 and 99),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  enabled boolean not null default true,
  product_ids uuid[] not null check (array_ndims(product_ids) = 1
    and cardinality(product_ids) between 1 and 1000 and array_position(product_ids, null) is null),
  created_at timestamptz not null default now(),
  check (isfinite(starts_at) and isfinite(ends_at) and ends_at > starts_at)
);
create index discount_events_products on public.discount_events using gin (product_ids) where enabled;
create index discount_events_window on public.discount_events (ends_at, starts_at) where enabled;
alter table public.discount_events enable row level security;
revoke all on public.discount_events from public, anon, authenticated;
grant select, insert, update on public.discount_events to authenticated;
create policy "Staff reads discount events" on public.discount_events for select to authenticated
  using ((select private.staff_role()) in ('owner','marketing_editor'));
create policy "Staff creates discount events" on public.discount_events for insert to authenticated
  with check ((select private.staff_role()) in ('owner','marketing_editor'));
create policy "Staff updates discount events" on public.discount_events for update to authenticated
  using ((select private.staff_role()) in ('owner','marketing_editor'))
  with check ((select private.staff_role()) in ('owner','marketing_editor'));

create function private.validate_discount_products() returns trigger
language plpgsql set search_path = '' as $$
begin
  if cardinality(new.product_ids) <> (select count(*) from public.products p where p.id = any(new.product_ids)) then
    raise exception 'Choose existing products once each' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function private.validate_discount_products() from public, anon, authenticated;
create trigger validate_discount_products before insert or update of product_ids on public.discount_events
  for each row execute function private.validate_discount_products();
create trigger audit_discount_events after insert or update on public.discount_events
  for each row execute function private.audit_change();

-- Only effective percentages for visible products and the next change time
-- are public. Event names, assignments, and internal history remain staff-only.
create function private.current_discount_pricing() returns jsonb
language sql stable security definer set search_path = '' as $$
  with events as (
    select d.starts_at, d.ends_at, d.percent_off, p.id
    from public.discount_events d
    cross join lateral unnest(d.product_ids) target(id)
    join public.products p on p.id = target.id
    where d.enabled and d.ends_at > statement_timestamp() and p.status in ('published', 'preview')
  ), active as (
    select id, max(percent_off) as percent from events where starts_at <= statement_timestamp() group by id
  )
  select jsonb_build_object(
    'rates', coalesce((select jsonb_object_agg(id, percent) from active), '{}'::jsonb),
    'next_change_at', (select min(case when starts_at > statement_timestamp() then starts_at else ends_at end) from events)
  );
$$;
revoke all on function private.current_discount_pricing() from public, anon, authenticated;
grant execute on function private.current_discount_pricing() to anon, authenticated;

create function public.current_wons_discount_pricing() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.current_discount_pricing();
$$;
revoke all on function public.current_wons_discount_pricing() from public, anon, authenticated;
grant execute on function public.current_wons_discount_pricing() to anon, authenticated;

-- Same whole-VND rounding as the storefront. Keep any historical override
-- as a fallback outside events; the product editor no longer offers it.
create function private.order_variant_price(target_product uuid, regular integer, legacy integer, at_time timestamptz)
returns integer language sql stable set search_path = '' as $$
  select case when discount.percent is not null
    then greatest(1, ((regular::bigint * (100 - discount.percent) + 50) / 100)::integer)
    when legacy > 0 and legacy < regular then legacy
    else regular end
  from (
    select max(d.percent_off) as percent from public.discount_events d
    where d.enabled and d.product_ids @> array[target_product]
      and d.starts_at <= at_time and at_time < d.ends_at
  ) discount;
$$;
revoke all on function private.order_variant_price(uuid, integer, integer, timestamptz) from public, anon, authenticated;

-- Keep the existing COD gateway, stock reservation, and retry behavior;
-- only replace how the authoritative unit price is obtained.
create or replace function private.submit_order(gateway_secret text, order_data jsonb, client_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  order_id uuid;
  fingerprint bytea;
  existing public.wons_orders%rowtype;
  buyer_email text;
  buyer_phone text;
  items jsonb;
  item record;
  snapshots jsonb := '[]'::jsonb;
  total bigint := 0;
  amount integer := 0;
  processed integer := 0;
  product_ids uuid[];
  product_id_to_lock uuid;
  new_number bigint;
  test_order boolean;
begin
  if (select auth.uid()) is not null or gateway_secret is null or length(gateway_secret) <> 64
    or not exists (
      select 1 from private.order_gateway g
      where g.secret_hash = sha256(convert_to(gateway_secret, 'UTF8'))
    ) then
    raise exception 'Order gateway required' using errcode = '42501';
  end if;
  if jsonb_typeof(order_data) is distinct from 'object' or pg_column_size(order_data) > 24000
    or (client_key is not null and client_key !~ '^[a-f0-9]{64}$')
    or not private.valid_order_address(order_data->'billing')
    or not private.valid_order_address(order_data->'delivery')
    or length(coalesce(order_data->>'notes', '')) > 500
    or coalesce(order_data->>'id', '') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then
    raise exception 'Invalid order' using errcode = '22023';
  end if;
  test_order := coalesce(order_data->'test' = 'true'::jsonb, false);
  order_id := (order_data->>'id')::uuid;
  buyer_email := lower(btrim(order_data->>'email'));
  buyer_phone := order_data->>'phone';
  items := order_data->'items';
  if buyer_email is null or length(buyer_email) > 160
    or buyer_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or coalesce(buyer_phone, '') !~ '^\+?[0-9]{8,15}$'
    or jsonb_typeof(items) is distinct from 'array' then
    raise exception 'Invalid order' using errcode = '22023';
  end if;
  if jsonb_array_length(items) not between 1 and 30 or exists (
    select 1 from jsonb_array_elements(items) as x(v)
    where jsonb_typeof(v) is distinct from 'object'
      or coalesce(v->>'variantId', '') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
      or coalesce(v->>'quantity','') !~ '^([1-9]|10)$'
      or coalesce(v->>'price','') !~ '^[1-9][0-9]{0,9}$'
  ) then
    raise exception 'Invalid order items' using errcode = '22023';
  end if;
  if test_order and (jsonb_array_length(items) <> 1 or items->0->>'quantity' <> '1') then
    raise exception 'Use one sample item for a COD test' using errcode = '22023';
  end if;
  if (select count(distinct (v->>'variantId')::uuid) from jsonb_array_elements(items) x(v)) <> jsonb_array_length(items)
    or (select sum((v->>'quantity')::int) from jsonb_array_elements(items) x(v)) > 30 then
    raise exception 'Invalid order quantities' using errcode = '22023';
  end if;

  fingerprint := sha256(convert_to(order_data::text, 'UTF8'));
  perform pg_advisory_xact_lock(hashtextextended('wons-order:' || order_id::text, 0));
  select * into existing from public.wons_orders where id = order_id;
  if found then
    if existing.request_hash <> fingerprint then
      raise exception 'Request details changed' using errcode = 'WN003';
    end if;
    return jsonb_build_object('order_number', existing.order_number, 'total_vnd', existing.total_vnd);
  end if;

  if client_key is not null then
    perform pg_advisory_xact_lock(hashtextextended('wons-client:' || client_key, 0));
  end if;
  perform pg_advisory_xact_lock(hashtextextended('wons-email:' || buyer_email, 0));
  perform pg_advisory_xact_lock(hashtextextended('wons-phone:' || buyer_phone, 0));
  if (select count(*) from public.wons_orders o where o.is_test = test_order and o.email = buyer_email and o.created_at >= now() - interval '1 hour') >= 3
    or (select count(*) from public.wons_orders o where o.is_test = test_order and o.phone = buyer_phone and o.created_at >= now() - interval '1 hour') >= 3
    or (client_key is not null and (select count(*) from public.wons_orders o where o.is_test = test_order and o.client_key = submit_order.client_key and o.created_at >= now() - interval '1 hour') >= 8) then
    raise exception 'Order limit reached' using errcode = 'WN002';
  end if;

  select array_agg(distinct v.product_id) into product_ids
  from public.variants v
  join jsonb_array_elements(items) x(j) on v.id = (j->>'variantId')::uuid;
  -- Lock products before variants, as in the product editor. Bump product
  -- versions below so an older staff form cannot overwrite a reservation.
  perform p.id from public.products p where p.id = any(product_ids) order by p.id for update;
  for item in
    select v.id, v.sku, v.color, v.size, v.available_quantity, p.name,
      private.order_variant_price(v.product_id, v.price_vnd, v.sale_price_vnd, statement_timestamp()) as price,
      (j->>'quantity')::int as quantity, (j->>'price')::bigint as expected_price
    from public.variants v
    join jsonb_array_elements(items) x(j) on v.id = (j->>'variantId')::uuid
    join public.products p on p.id = v.product_id and p.id = any(product_ids)
    where (test_order and p.status = 'preview' and p.is_demo)
       or (not test_order and p.status = 'published' and not p.is_demo)
    order by v.id for update of v
  loop
    if item.available_quantity < item.quantity or item.price <> item.expected_price then
      raise exception 'Bag changed' using errcode = 'WN001';
    end if;
    total := total + item.price::bigint * item.quantity;
    amount := amount + item.quantity;
    processed := processed + 1;
    snapshots := snapshots || jsonb_build_object('variantId', item.id, 'sku', item.sku,
      'name', item.name, 'color', item.color, 'size', item.size, 'price', item.price, 'quantity', item.quantity);
    if not test_order then
      update public.variants set available_quantity = available_quantity - item.quantity where id = item.id;
    end if;
  end loop;
  if processed <> jsonb_array_length(items) then
    raise exception 'Bag changed' using errcode = 'WN001';
  end if;
  if not test_order then
    foreach product_id_to_lock in array product_ids loop
      update public.products set updated_at = now() where id = product_id_to_lock;
    end loop;
  end if;

  insert into public.wons_orders (id, email, phone, billing, delivery, notes, lines, item_count, subtotal_vnd, request_hash, client_key, is_test)
  values (order_id, buyer_email, buyer_phone, order_data->'billing', order_data->'delivery',
    coalesce(order_data->>'notes', ''), snapshots, amount, total, fingerprint, client_key, test_order)
  returning order_number into new_number;
  return jsonb_build_object('order_number', new_number, 'total_vnd', total);
end $$;
