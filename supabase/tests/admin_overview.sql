-- Isolated fixtures only. Report totals span the VN day boundary and use two different event dates.
begin;
do $$
declare
  owner_id uuid := gen_random_uuid();
  editor_id uuid := gen_random_uuid();
  owner_session uuid := gen_random_uuid();
  editor_session uuid := gen_random_uuid();
  pid uuid := gen_random_uuid();
  hidden_id uuid := gen_random_uuid();
  today date := (statement_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date;
  midnight timestamptz := (today - 6)::timestamp at time zone 'Asia/Ho_Chi_Minh';
  pending_id uuid := gen_random_uuid();
begin
  insert into auth.users(id,email,email_confirmed_at) values
    (owner_id,'overview-owner@example.invalid',now()), (editor_id,'overview-editor@example.invalid',now());
  insert into auth.sessions(id,user_id) values (owner_session,owner_id), (editor_session,editor_id);
  insert into public.staff_members(email,role) values ('overview-owner@example.invalid','owner'), ('overview-editor@example.invalid','marketing_editor');
  perform set_config('wons.test.overview_owner',jsonb_build_object('sub',owner_id,'session_id',owner_session)::text,true);
  perform set_config('wons.test.overview_editor',jsonb_build_object('sub',editor_id,'session_id',editor_session)::text,true);
  perform set_config('wons.test.overview_pending',pending_id::text,true);

  insert into public.products(id,slug,name,department,category,description,status,is_demo) values
    (pid,'overview-fixture','Overview fixture','Women','Shirts','Fixture','published',false),
    (hidden_id,'overview-hidden-fixture','Hidden fixture','Women','Shirts','Fixture','hidden',false);
  insert into public.product_images(product_id,storage_path,alt,sort_order) values
    (pid,pid::text || '/' || gen_random_uuid()::text || '.png','Fixture',0);
  insert into public.variants(product_id,sku,color,color_hex,size,price_vnd,available_quantity) values
    (pid,'OV-1','Ivory','#eeeeee','S',100000,5),(pid,'OV-2','Ivory','#eeeeee','M',100000,3),
    (pid,'OV-3','Ivory','#eeeeee','L',100000,0),(hidden_id,'OV-H','Ivory','#eeeeee','L',100000,50);

  insert into public.wons_orders(id,created_at,completed_at,status,is_test,item_count,subtotal_vnd,email,phone,billing,delivery,lines,request_hash)
  select a.id,a.created_at,a.completed_at,a.status,a.is_test,a.items,a.total,'fixture@example.invalid','0900000000','{}','{}','[]',sha256('fixture'::bytea)
  from (values
    (gen_random_uuid(),midnight - interval '10 days',midnight,'completed',false,2,310000),
    (gen_random_uuid(),midnight - interval '1 day',midnight - interval '1 microsecond','completed',false,1,140000),
    (gen_random_uuid(),midnight,midnight + interval '2 hours','completed',false,3,450000),
    (gen_random_uuid(),midnight,midnight + interval '2 hours','completed',true,9,990000),
    (pending_id,midnight,null,'delivered',false,1,120000),
    (gen_random_uuid(),midnight,null,'cancelled',false,1,180000),
    (gen_random_uuid(),midnight - interval '1 second',null,'pending',false,1,220000)
  ) as a(id,created_at,completed_at,status,is_test,items,total);
end $$;
set constraints all immediate;
set local role anon;
do $$ begin
  begin perform public.wons_admin_overview(7);
    raise exception 'Guest could run overview'; exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claims',current_setting('wons.test.overview_editor'),true);
do $$ begin
  begin perform public.wons_admin_overview(7);
    raise exception 'Editor could run overview'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims',current_setting('wons.test.overview_owner'),true);
do $$
declare r jsonb := public.wons_admin_overview(7);
  completed jsonb;
  oid uuid := current_setting('wons.test.overview_pending')::uuid;
begin
  if r->'sales' <> '{"revenue_vnd":760000,"units":5,"orders":2}'::jsonb
     or r->'order_counts' <> '{"completed":1,"delivered":1,"cancelled":1}'::jsonb
     or r->'inventory' <> '{"units":8,"in_stock":1,"low_stock":1,"out_of_stock":1}'::jsonb
     or jsonb_array_length(r->'series') <> 7
     or (r#>>'{series,0,revenue_vnd}')::integer <> 760000
     or (r#>>'{series,1,units}')::integer <> 0
     then raise exception 'Overview used the wrong events, dates, filters or quantities: %',r; end if;
  if jsonb_array_length(public.wons_admin_overview(30)->'series') <> 5
     or jsonb_array_length(public.wons_admin_overview(90)->'series') <> 13
     then raise exception 'Overview range bucket count was wrong'; end if;
  begin perform public.wons_admin_overview(31);
    raise exception 'Invalid report range succeeded'; exception when invalid_parameter_value then null; end;
  perform public.manage_wons_order(oid,'complete');
  if not exists (select id from public.wons_orders where id=oid and completed_at is not null)
     then raise exception 'Completion was not timestamped'; end if;
  completed := public.wons_admin_overview(7);
  if completed->'sales' <> '{"revenue_vnd":880000,"units":6,"orders":3}'::jsonb
     or (completed#>>'{series,6,revenue_vnd}')::integer <> 120000
     then raise exception 'Newly completed order was not counted on completion day'; end if;
end $$;
rollback;
select 'PASS: Owner-only analytics, VN date boundaries, COD exclusion, live inventory and recorded completion' as result;
