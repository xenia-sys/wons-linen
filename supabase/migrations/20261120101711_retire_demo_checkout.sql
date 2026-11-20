-- Retire demo checkout at the database boundary as well as in the application.
-- Historical is_test orders remain available for audit; new orders are always real COD.
-- Keep existing gateway authentication, discounts, stock locking and retry semantics.
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
  if order_data ? 'test' and order_data->'test' is distinct from 'false'::jsonb then
    raise exception 'Test checkout is no longer available' using errcode = '22023';
  end if;
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
  if (select count(*) from public.wons_orders o where not o.is_test and o.email = buyer_email and o.created_at >= now() - interval '1 hour') >= 3
    or (select count(*) from public.wons_orders o where not o.is_test and o.phone = buyer_phone and o.created_at >= now() - interval '1 hour') >= 3
    or (client_key is not null and (select count(*) from public.wons_orders o where not o.is_test and o.client_key = submit_order.client_key and o.created_at >= now() - interval '1 hour') >= 8) then
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
    where p.status = 'published' and not p.is_demo
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
    update public.variants set available_quantity = available_quantity - item.quantity where id = item.id;
  end loop;
  if processed <> jsonb_array_length(items) then
    raise exception 'Bag changed' using errcode = 'WN001';
  end if;
  foreach product_id_to_lock in array product_ids loop
    update public.products set updated_at = now() where id = product_id_to_lock;
  end loop;

  insert into public.wons_orders (id, email, phone, billing, delivery, notes, lines, item_count, subtotal_vnd, request_hash, client_key, is_test)
  values (order_id, buyer_email, buyer_phone, order_data->'billing', order_data->'delivery',
    coalesce(order_data->>'notes', ''), snapshots, amount, total, fingerprint, client_key, false)
  returning order_number into new_number;
  return jsonb_build_object('order_number', new_number, 'total_vnd', total);
end $$;
