-- Isolated PostgreSQL fixtures only; never execute against hosted Supabase.
begin;
do $$
declare
  pid uuid := gen_random_uuid();
  vid uuid := gen_random_uuid();
  owner_id uuid := gen_random_uuid();
  editor_id uuid := gen_random_uuid();
  customer_id uuid := gen_random_uuid();
  owner_session uuid := gen_random_uuid();
  editor_session uuid := gen_random_uuid();
  customer_session uuid := gen_random_uuid();
  address jsonb := '{"firstName":"Sample","lastName":"Guest","street":"Test street","city":"Test city","country":"Vietnam"}';
  demo public.variants%rowtype;
begin
  insert into private.order_gateway(secret_hash) values (sha256(convert_to(repeat('a',64),'UTF8')));
  insert into public.products (id, slug, name, department, category, description, status, is_demo)
    values (pid,'fixture-order-product','Fixture Linen Shirt','Women','Shirts','Synthetic only','published',false);
  insert into public.variants (id,product_id,sku,color,color_hex,size,price_vnd,sale_price_vnd,available_quantity)
    values (vid,pid,'ORDER-FIXTURE','Ivory','#ffffff','M',890000,790000,2);
  insert into public.product_images (product_id,storage_path,alt,sort_order)
    values (pid,pid::text || '/' || gen_random_uuid()::text || '.png','Synthetic image',0);
  insert into auth.users(id,email,email_confirmed_at) values
    (owner_id,'owner-order@example.invalid',now()), (editor_id,'editor-order@example.invalid',now()), (customer_id,'customer-order@example.invalid',now());
  insert into auth.sessions(id,user_id) values (owner_session,owner_id), (editor_session,editor_id), (customer_session,customer_id);
  insert into public.staff_members(email,role) values ('owner-order@example.invalid','owner'), ('editor-order@example.invalid','marketing_editor');
  perform set_config('wons.test.owner', jsonb_build_object('sub',owner_id,'session_id',owner_session)::text,true);
  perform set_config('wons.test.editor', jsonb_build_object('sub',editor_id,'session_id',editor_session)::text,true);
  perform set_config('wons.test.customer', jsonb_build_object('sub',customer_id,'session_id',customer_session)::text,true);
  perform set_config('wons.test.variant', vid::text,true);
  select * into demo from public.variants where available_quantity>0 and id<>vid limit 1;
  perform set_config('wons.test.demo', jsonb_build_object('variantId',demo.id,'quantity',1,'price',demo.price_vnd)::text,true);
  perform set_config('wons.test.payload', jsonb_build_object(
    'id',gen_random_uuid(),'email','sample@example.invalid','phone','0900000000','billing',address,
    'delivery',address || '{"street":"Other test street"}','notes','Fixture only',
    'items',jsonb_build_array(jsonb_build_object('variantId',vid,'quantity',2,'price',790000)))::text,true);
end $$;
set constraints all immediate;

set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$
declare
  payload jsonb := current_setting('wons.test.payload')::jsonb;
  receipt jsonb;
  altered jsonb;
begin
  begin perform public.submit_wons_order(repeat('b',64),payload,null);
    raise exception 'Wrong gateway authorized'; exception when insufficient_privilege then null; end;
  begin perform id from public.wons_orders;
    raise exception 'Guest read orders'; exception when insufficient_privilege then null; end;
  begin perform public.submit_wons_order(repeat('a',64),jsonb_set(payload,'{delivery,country}','"France"'),null);
    raise exception 'International destination accepted'; exception when invalid_parameter_value then null; end;
  altered := jsonb_set(payload,'{items,0,price}','1');
  begin perform public.submit_wons_order(repeat('a',64),altered,null);
    raise exception 'Client price accepted'; exception when sqlstate 'WN001' then null; end;
  altered := jsonb_set(payload,'{items}',jsonb_build_array(current_setting('wons.test.demo')::jsonb));
  begin perform public.submit_wons_order(repeat('a',64),altered,null);
    raise exception 'Demo item ordered'; exception when sqlstate 'WN001' then null; end;
  receipt := public.submit_wons_order(repeat('a',64),payload,repeat('c',64));
  if (receipt->>'total_vnd')::bigint is distinct from 1580000::bigint or not (receipt ? 'order_number') or receipt ? 'email' then
    raise exception 'Receipt total incorrect';
  end if;
  if public.submit_wons_order(repeat('a',64),payload,repeat('c',64)) <> receipt then
    raise exception 'Retry was not idempotent';
  end if;
  begin perform public.submit_wons_order(repeat('a',64),payload || '{"notes":"Changed"}',null);
    raise exception 'Conflicting retry accepted'; exception when sqlstate 'WN003' then null; end;
  begin perform public.submit_wons_order(repeat('a',64),payload || jsonb_build_object('id',gen_random_uuid()),null);
    raise exception 'Out-of-stock order accepted'; exception when sqlstate 'WN001' then null; end;
end $$;

set local role authenticated;
select set_config('request.jwt.claims',current_setting('wons.test.customer'),true);
do $$ begin
  if exists(select id from public.wons_orders) then raise exception 'Customer read orders'; end if;
end $$;
select set_config('request.jwt.claims',current_setting('wons.test.editor'),true);
do $$
declare id uuid := (current_setting('wons.test.payload')::jsonb->>'id')::uuid;
begin
  if exists(select w.id from public.wons_orders w) then raise exception 'Marketing read orders'; end if;
  begin perform public.manage_wons_order(id,'cancel');
    raise exception 'Marketing changed an order'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims',current_setting('wons.test.owner'),true);
do $$
declare
  oid uuid := (current_setting('wons.test.payload')::jsonb->>'id')::uuid;
  vid uuid := current_setting('wons.test.variant')::uuid;
begin
  if (select count(id) from public.wons_orders) <> 1 or
    not exists(select id from public.wons_orders where id=oid and status='pending' and seen_at is null
      and total_vnd=1580000 and delivery_vnd=0 and delivery->>'street'='Other test street' and email='sample@example.invalid') then
    raise exception 'Owner inbox missing or has incorrect order data';
  end if;
  if (select available_quantity from public.variants where id=vid) <> 0 then raise exception 'Stock was not reserved'; end if;
  if (select p.version from public.products p join public.variants v on v.product_id=p.id where v.id=vid) <> 2 then
    raise exception 'Stale product editor not invalidated';
  end if;
  begin update public.wons_orders set status='cancelled' where id=oid;
    raise exception 'Direct mutation was allowed'; exception when insufficient_privilege then null; end;
  perform public.manage_wons_order(oid,'seen');
  if (select seen_at from public.wons_orders where id=oid) is null then raise exception 'Order not marked read'; end if;
  if public.manage_wons_order(oid,'confirm') <> 'confirmed' then raise exception 'Confirmation failed'; end if;
  if public.manage_wons_order(oid,'cancel') <> 'cancelled' then raise exception 'Cancellation failed'; end if;
  begin perform public.manage_wons_order(oid,'cancel');
    raise exception 'Repeated cancellation accepted'; exception when sqlstate 'WN004' then null; end;
  if (select available_quantity from public.variants where id=vid) <> 2 then raise exception 'Stock was not returned exactly once'; end if;
end $$;
rollback;
select 'PASS: guest gateway, Vietnam, authoritative price, demo rejection, retry, inventory, Owner inbox/RLS, unread, confirmation and restock' as result;
