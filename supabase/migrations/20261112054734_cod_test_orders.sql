-- The existing gateway is the only writer. The Next.js server only passes
-- test=true after validating a short-lived cookie issued to a verified Owner.
alter table public.wons_orders
  add column payment_method text not null default 'cod' check (payment_method = 'cod'),
  add column is_test boolean not null default false;
grant select (payment_method, is_test) on public.wons_orders to authenticated;

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
      case when v.sale_price_vnd > 0 and v.sale_price_vnd < v.price_vnd then v.sale_price_vnd else v.price_vnd end as price,
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

create or replace function private.manage_order(order_id uuid, order_action text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  target public.wons_orders%rowtype;
  item record;
  product_ids uuid[];
begin
  if (select auth.uid()) is null or (select private.staff_role()) is distinct from 'owner' then
    raise exception 'Owner access required' using errcode = '42501';
  end if;
  select * into target from public.wons_orders where id = order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  if order_action = 'seen' then
    update public.wons_orders set seen_at = now() where id = order_id and seen_at is null;
    return target.status;
  end if;
  if order_action not in ('confirm', 'cancel') or order_action is null then
    raise exception 'Invalid order action' using errcode = '22023';
  end if;
  if target.status = 'cancelled' or (target.status = 'confirmed' and order_action = 'confirm') then
    raise exception 'Order already processed' using errcode = 'WN004';
  end if;
  if order_action = 'cancel' and not target.is_test then
    select array_agg(distinct v.product_id) into product_ids from public.variants v
      join jsonb_array_elements(target.lines) x(j) on v.id = (j->>'variantId')::uuid;
    perform p.id from public.products p where p.id = any(product_ids) order by p.id for update;
    for item in select j from jsonb_array_elements(target.lines) x(j) order by j->>'variantId' loop
      update public.variants set available_quantity = available_quantity + (item.j->>'quantity')::int
      where id = (item.j->>'variantId')::uuid and product_id = any(product_ids);
    end loop;
    update public.products set updated_at = now() where id = any(product_ids);
  end if;
  update public.wons_orders set status = case when order_action = 'confirm' then 'confirmed' else 'cancelled' end,
    seen_at = coalesce(seen_at, now()) where id = order_id returning status into target.status;
  return target.status;
end $$;
