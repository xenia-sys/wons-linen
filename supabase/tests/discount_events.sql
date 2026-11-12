-- Isolated database fixtures. Never create live offers or orders.
begin;
do $$
declare
  product uuid := gen_random_uuid();
  hidden uuid := gen_random_uuid();
  variant uuid := gen_random_uuid();
  editor uuid := gen_random_uuid();
  editor_session uuid := gen_random_uuid();
  customer uuid := gen_random_uuid();
  customer_session uuid := gen_random_uuid();
  address jsonb := '{"firstName":"Discount","lastName":"Fixture","street":"Test street","city":"Test city","country":"Vietnam"}';
begin
  insert into private.order_gateway(secret_hash) values (sha256(convert_to(repeat('a',64),'UTF8')));
  insert into public.products(id,slug,name,department,category,description,status,is_demo) values
    (product,'offer-fixture','Offer fixture','Women','Shirts','','published',false),
    (hidden,'hidden-fixture','Hidden fixture','Women','Shirts','','hidden',false);
  insert into public.variants(id,product_id,sku,color,color_hex,size,price_vnd,available_quantity)
    values (variant,product,'OFFER-FIXTURE','Ivory','#ffffff','M',790000,5);
  insert into auth.users(id,email,email_confirmed_at) values
    (editor,'marketing-offers@example.invalid',now()), (customer,'customer-offers@example.invalid',now());
  insert into auth.sessions(id,user_id) values (editor_session,editor), (customer_session,customer);
  insert into public.staff_members(email,role) values ('marketing-offers@example.invalid','marketing_editor');
  perform set_config('wons.test.editor',jsonb_build_object('sub',editor,'session_id',editor_session)::text,true);
  perform set_config('wons.test.customer',jsonb_build_object('sub',customer,'session_id',customer_session)::text,true);
  perform set_config('wons.test.offer',product::text,true);
  perform set_config('wons.test.hidden_offer',hidden::text,true);
  perform set_config('wons.test.payload',jsonb_build_object(
    'id',gen_random_uuid(),'email','offer-fixture@example.invalid','phone','0910000000','billing',address,
    'delivery',address,'notes','Fixture only',
    'items',jsonb_build_array(jsonb_build_object('variantId',variant,'quantity',2,'price',632000)))::text,true);
end $$;

set local role authenticated;
select set_config('request.jwt.claims',current_setting('wons.test.customer'),true);
do $$
begin
  if exists(select id from public.discount_events) then raise exception 'Customer read private events'; end if;
  begin
    insert into public.discount_events(name,percent_off,starts_at,ends_at,product_ids)
      values ('Customer event',20,now(),now()+interval '1 hour',array[current_setting('wons.test.offer')::uuid]);
    raise exception 'Customer created an event';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claims',current_setting('wons.test.editor'),true);
do $$
declare
  product uuid := current_setting('wons.test.offer')::uuid;
  hidden uuid := current_setting('wons.test.hidden_offer')::uuid;
begin
  begin
    insert into public.discount_events(name,percent_off,starts_at,ends_at,product_ids)
      values ('Invalid selection',20,now(),now()+interval '1 hour',array[product,gen_random_uuid()]);
    raise exception 'Unknown product accepted';
  exception when check_violation then null;
  end;
  insert into public.discount_events(name,percent_off,starts_at,ends_at,enabled,product_ids) values
    ('Active offer',20,now()-interval '10 minutes',now()+interval '1 hour',true,array[product]),
    ('Overlapping offer',10,now()-interval '10 minutes',now()+interval '1 hour',true,array[product]),
    ('Scheduled offer',60,now()+interval '5 minutes',now()+interval '2 hours',true,array[product]),
    ('Ended offer',80,now()-interval '2 hours',now()-interval '1 hour',true,array[product]),
    ('Paused offer',90,now()-interval '1 hour',now()+interval '1 hour',false,array[product]),
    ('Hidden offer',90,now()-interval '1 hour',now()+interval '1 hour',true,array[hidden]);
end $$;

reset role;
do $$
declare
  product uuid := current_setting('wons.test.offer')::uuid;
  start_time timestamptz := now() + interval '5 minutes';
  end_time timestamptz := now() + interval '2 hours';
begin
  if private.order_variant_price(product,790000,null,start_time-interval '1 millisecond') <> 632000
    or private.order_variant_price(product,790000,null,start_time) <> 316000
    or private.order_variant_price(product,790000,null,end_time) <> 790000
    or private.order_variant_price(product,105,null,now()) <> 84 then
    raise exception 'Scheduled discounts, overlap or rounding are incorrect';
  end if;
  if (select count(*) from public.activity_log where entity_type='discount_events' and action='INSERT') <> 6 then
    raise exception 'Discount events are not audited';
  end if;
end $$;

set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$
declare
  pricing jsonb := public.current_wons_discount_pricing();
  product text := current_setting('wons.test.offer');
  payload jsonb := current_setting('wons.test.payload')::jsonb;
  receipt jsonb;
begin
  if (pricing->'rates') <> jsonb_build_object(product,20)
    or (pricing->>'next_change_at')::timestamptz is distinct from now()+interval '5 minutes' then
    raise exception 'Public pricing leaked non-current discounts or has an incorrect change time';
  end if;
  begin
    perform name from public.discount_events;
    raise exception 'Guest read event details';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.submit_wons_order(repeat('a',64),jsonb_set(payload,'{items,0,price}','790000'),null);
    raise exception 'Checkout accepted a stale regular price during a discount';
  exception when sqlstate 'WN001' then null;
  end;
  receipt := public.submit_wons_order(repeat('a',64),payload,null);
  if (receipt->>'total_vnd')::integer is distinct from 1264000 then raise exception 'Discounted COD total is incorrect'; end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims',current_setting('wons.test.editor'),true);
update public.discount_events set enabled = false where name in ('Active offer','Overlapping offer');
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$
declare payload jsonb := current_setting('wons.test.payload')::jsonb;
begin
  if (public.current_wons_discount_pricing()->'rates') <> '{}'::jsonb then
    raise exception 'A paused event is still publicly active';
  end if;
  begin
    perform public.submit_wons_order(repeat('a',64),payload || jsonb_build_object('id',gen_random_uuid()),null);
    raise exception 'Checkout accepted a stale discount after pause';
  exception when sqlstate 'WN001' then null;
  end;
  if (public.submit_wons_order(repeat('a',64),payload,null)->>'total_vnd')::integer is distinct from 1264000 then
    raise exception 'A completed order price changed after the event ended';
  end if;
end $$;
rollback;
select 'PASS: Vietnam schedule boundaries, maximum overlap, private events, staff writes, discounted COD and stale cart rejection' as result;
