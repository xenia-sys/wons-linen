-- Isolated PostgreSQL fixtures only; never execute against hosted Supabase.
begin;
do $$
declare
  editor_id uuid := gen_random_uuid();
  editor_session uuid := gen_random_uuid();
begin
  insert into auth.users(id,email,email_confirmed_at)
    values(editor_id,'free-size-editor@example.invalid',now());
  insert into auth.sessions(id,user_id) values(editor_session,editor_id);
  insert into public.staff_members(email,role)
    values('free-size-editor@example.invalid','marketing_editor');
  insert into private.order_gateway(secret_hash)
    values(sha256(convert_to(repeat('a',64),'UTF8')));
  perform set_config('wons.free.editor',jsonb_build_object('sub',editor_id,'session_id',editor_session)::text,true);
end $$;

set local role authenticated;
select set_config('request.jwt.claims',current_setting('wons.free.editor'),true);
do $$
declare
  pid uuid;
  vid uuid;
  photo_path text;
  saved jsonb;
  payload jsonb := jsonb_build_object(
    'slug','fixture-free-size','name','Fixture free size shirt','department','Women',
    'category','Shirts','description','Synthetic only','status','hidden','is_demo',false,
    'sort_order',0,'images','[]'::jsonb,'variants',jsonb_build_array(jsonb_build_object(
      'sku','FIXTURE-FREE-IVORY','color','Ivory','color_hex','#ffffff','size','Free size',
      'price_vnd',790000,'sale_price_vnd',null,'available_quantity',3)));
begin
  saved := public.admin_save_product_with_arrival(payload);
  pid := (saved->>'id')::uuid;
  select id into strict vid from public.variants where product_id=pid and size='Free size';
  if not exists(select 1 from public.variants where id=vid and available_quantity=3) then
    raise exception 'Marketing could not save a Free size variant';
  end if;
  payload := payload || jsonb_build_object('id',pid,'version',saved->'version');
  payload := jsonb_set(payload,'{variants,0,id}',to_jsonb(vid));
  payload := jsonb_set(payload,'{variants,0,size}','"M"'::jsonb);
  saved := public.admin_save_product_with_arrival(payload);
  if not exists(select 1 from public.variants where id=vid and size='M') then
    raise exception 'Could not change an existing variant to a regular size';
  end if;
  payload := jsonb_set(payload,'{version}',saved->'version');
  payload := jsonb_set(payload,'{variants,0,size}','"Free size"'::jsonb);
  payload := jsonb_set(payload,'{status}','"published"'::jsonb);
  photo_path := pid::text || '/' || gen_random_uuid()::text || '.webp';
  insert into storage.objects(bucket_id,name,metadata)
    values('product-images',photo_path,'{"mimetype":"image/webp","size":32}');
  payload := jsonb_set(payload,'{images}',jsonb_build_array(jsonb_build_object(
    'storage_path',photo_path,'alt','Fixture photo','color',null)));
  saved := public.admin_save_product_with_arrival(payload);
  if not exists(select 1 from public.variants where id=vid and size='Free size') then
    raise exception 'Could not edit and publish an existing Free size variant';
  end if;
  begin
    update public.variants set size='Unknown' where id=vid;
    raise exception 'Invalid size was accepted';
  exception when check_violation then null;
  end;
  perform set_config('wons.free.pid',pid::text,true);
  perform set_config('wons.free.vid',vid::text,true);
end $$;
set constraints all immediate;

set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$
declare
  vid uuid := current_setting('wons.free.vid')::uuid;
  oid uuid := gen_random_uuid();
  address jsonb := '{"firstName":"Sample","lastName":"Guest","street":"Test street","city":"Test city","country":"Vietnam"}';
begin
  if not exists(select 1 from public.variants where id=vid and size='Free size' and available_quantity=3) then
    raise exception 'Storefront cannot read a published Free size variant';
  end if;
  perform public.submit_wons_order(repeat('a',64),jsonb_build_object(
    'id',oid,'email','free-size-buyer@example.invalid','phone','0900000000',
    'billing',address,'delivery',address,'notes','Synthetic only',
    'items',jsonb_build_array(jsonb_build_object('variantId',vid,'quantity',2,'price',790000))),null);
  perform set_config('wons.free.oid',oid::text,true);
end $$;

reset role;
do $$
begin
  if not exists(select 1 from public.wons_orders where id=current_setting('wons.free.oid')::uuid
    and lines->0->>'size'='Free size' and lines->0->>'color'='Ivory' and subtotal_vnd=1580000) then
    raise exception 'COD order did not preserve the Free size snapshot';
  end if;
  if (select available_quantity from public.variants where id=current_setting('wons.free.vid')::uuid) <> 1 then
    raise exception 'Free size stock was not reserved correctly';
  end if;
end $$;
rollback;
select 'PASS: Marketing creates/edits/publishes Free size, public catalog reads it, COD preserves size and reserves stock' as result;
