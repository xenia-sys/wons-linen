-- Isolated database fixtures only. Never submit these to hosted WONS.
begin;
do $$
declare
  alice uuid := gen_random_uuid(); bob uuid := gen_random_uuid(); owner_id uuid := gen_random_uuid();
  unverified uuid := gen_random_uuid();
  alice_session uuid := gen_random_uuid(); bob_session uuid := gen_random_uuid(); owner_session uuid := gen_random_uuid();
  unverified_session uuid := gen_random_uuid();
  pid uuid := gen_random_uuid(); vid uuid := gen_random_uuid();
  address jsonb := '{"firstName":"Fixture","lastName":"Customer","street":"Test street","city":"Test city","country":"Vietnam"}';
begin
  insert into private.order_gateway(secret_hash) values (sha256(convert_to(repeat('a',64),'UTF8')));
  insert into public.products(id,slug,name,department,category,description,status,is_demo)
    values (pid,'fixture-linked-order','Fixture Shirt','Women','Shirts','Synthetic only','published',false);
  insert into public.variants(id,product_id,sku,color,color_hex,size,price_vnd,available_quantity)
    values (vid,pid,'LINKED-FIXTURE','Ivory','#ffffff','M',890000,5);
  insert into public.product_images(product_id,storage_path,alt)
    values (pid,pid::text || '/' || gen_random_uuid()::text || '.png','Synthetic image');
  insert into auth.users(id,email,email_confirmed_at) values
    (alice,'linked-alice@example.invalid',now()), (bob,'linked-bob@example.invalid',now()),
    (owner_id,'linked-owner@example.invalid',now()), (unverified,'linked-unverified@example.invalid',null);
  insert into auth.sessions(id,user_id) values (alice_session,alice), (bob_session,bob), (owner_session,owner_id), (unverified_session,unverified);
  insert into public.staff_members(email,role) values ('linked-owner@example.invalid','owner');
  perform set_config('wons.link.alice',jsonb_build_object('role','authenticated','sub',alice,'session_id',alice_session)::text,true);
  perform set_config('wons.link.alice_session',alice_session::text,true);
  perform set_config('wons.link.bob',jsonb_build_object('role','authenticated','sub',bob,'session_id',bob_session)::text,true);
  perform set_config('wons.link.owner',jsonb_build_object('role','authenticated','sub',owner_id,'session_id',owner_session)::text,true);
  perform set_config('wons.link.unverified',jsonb_build_object('role','authenticated','sub',unverified,'session_id',unverified_session)::text,true);
  perform set_config('wons.link.variant',vid::text,true);
  perform set_config('wons.link.order',jsonb_build_object('id',gen_random_uuid(),'email','linked-bob@example.invalid',
    'phone','0000000000','billing',address,'delivery',address || '{"street":"Another test address"}',
    'items',jsonb_build_array(jsonb_build_object('variantId',vid,'quantity',1,'price',890000)))::text,true);
  perform set_config('wons.link.guest',jsonb_build_object('id',gen_random_uuid(),'email','linked-alice@example.invalid',
    'phone','0000000001','billing',address,'delivery',address,'customer_id',alice,
    'items',jsonb_build_array(jsonb_build_object('variantId',vid,'quantity',1,'price',890000)))::text,true);
end $$;
set constraints all immediate;

set local role anon;
select set_config('request.jwt.claims','{}',true);
select public.submit_wons_order(repeat('a',64),current_setting('wons.link.guest')::jsonb,null);

set local role authenticated;
select set_config('request.jwt.claims',current_setting('wons.link.alice'),true);
do $$
declare payload jsonb := current_setting('wons.link.order')::jsonb;
  receipt jsonb; ref text;
begin
  if exists (select 1 from public.customer_order_summaries) then raise exception 'Guest order linked by email or payload'; end if;
  begin perform public.submit_wons_order(repeat('b',64),payload,null);
    raise exception 'Customer bypassed the checkout gateway'; exception when insufficient_privilege then null; end;
  receipt := public.submit_wons_order(repeat('a',64),payload,null);
  ref := 'WONS-' || lpad(receipt->>'order_number',6,'0');
  if not exists (select 1 from public.customer_order_summaries where id=(payload->>'id')::uuid
    and order_number=ref and status='pending' and total_vnd=890000) then raise exception 'Missing linked order summary'; end if;
  if public.submit_wons_order(repeat('a',64),payload,null) <> receipt
     or (select count(*) from public.customer_order_summaries) <> 1 then raise exception 'Retry duplicated account order'; end if;
end $$;

select set_config('request.jwt.claims',current_setting('wons.link.bob'),true);
do $$ begin
  if exists (select 1 from public.customer_order_summaries) then raise exception 'Order visible to contact email instead of session owner'; end if;
  begin perform public.submit_wons_order(repeat('a',64),current_setting('wons.link.order')::jsonb,null);
    raise exception 'Different account retried protected order'; exception when sqlstate 'WN003' then null; end;
end $$;

select set_config('request.jwt.claims',current_setting('wons.link.unverified'),true);
do $$ begin
  begin perform public.submit_wons_order(repeat('a',64),current_setting('wons.link.order')::jsonb,null);
    raise exception 'Unverified account allowed'; exception when sqlstate 'WN006' then null; end;
end $$;

select set_config('request.jwt.claims',current_setting('wons.link.owner'),true);
do $$
declare oid uuid := (current_setting('wons.link.order')::jsonb->>'id')::uuid;
begin
  if (select count(id) from public.wons_orders) <> 2 then raise exception 'Orders missing from Owner inbox'; end if;
  if (select available_quantity from public.variants where id=current_setting('wons.link.variant')::uuid) <> 3 then raise exception 'Retry changed stock'; end if;
  begin perform public.submit_wons_order(repeat('a',64),current_setting('wons.link.order')::jsonb,null);
    raise exception 'Staff account allowed through customer checkout'; exception when sqlstate 'WN006' then null; end;
  perform public.manage_wons_order(oid,'confirm');
  perform public.manage_wons_order(oid,'pack');
end $$;

select set_config('request.jwt.claims',current_setting('wons.link.alice'),true);
do $$ begin
  if (select status from public.customer_order_summaries) is distinct from 'packed' then
    raise exception 'Admin status did not reach account history'; end if;
end $$;

select set_config('request.jwt.claims',current_setting('wons.link.owner'),true);
do $$
declare oid uuid := (current_setting('wons.link.order')::jsonb->>'id')::uuid;
begin
  perform public.manage_wons_order(oid,'ship');
  perform public.manage_wons_order(oid,'deliver');
  perform public.manage_wons_order(oid,'complete');
end $$;

select set_config('request.jwt.claims',current_setting('wons.link.alice'),true);
do $$ begin
  if (select status from public.customer_order_summaries) is distinct from 'completed' then
    raise exception 'Completion did not reach account history'; end if;
end $$;

reset role;
delete from auth.sessions where id=current_setting('wons.link.alice_session')::uuid;
set local role authenticated;
do $$ begin
  if exists (select 1 from public.customer_order_summaries) then raise exception 'Revoked customer read orders'; end if;
  begin perform public.submit_wons_order(repeat('a',64),current_setting('wons.link.order')::jsonb,null);
    raise exception 'Revoked session submitted an order'; exception when sqlstate 'WN006' then null; end;
end $$;
rollback;
select 'PASS: customer and guest checkout, order isolation, retries, stock, verified sessions and fulfillment sync' as result;
