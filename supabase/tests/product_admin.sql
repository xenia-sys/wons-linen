-- ISOLATED DATABASE ONLY. Run through scripts/test-admin-rls.mjs, never on hosted Supabase.
-- Synthetic identities and sessions exercise the platform contracts and are rolled back.
begin;
do $$
declare owner_id uuid:=gen_random_uuid(); editor_id uuid:=gen_random_uuid(); visitor_id uuid:=gen_random_uuid();
  owner_session uuid:=gen_random_uuid(); editor_session uuid:=gen_random_uuid(); visitor_session uuid:=gen_random_uuid();
  pid uuid:=gen_random_uuid(); vid uuid:=gen_random_uuid();
begin
  insert into auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at) values
    (owner_id,'authenticated','authenticated','wons-owner-rls@example.invalid',now(),now(),now()),
    (editor_id,'authenticated','authenticated','wons-editor-rls@example.invalid',now(),now(),now()),
    (visitor_id,'authenticated','authenticated','wons-visitor-rls@example.invalid',now(),now(),now());
  insert into auth.sessions(id,user_id,created_at,updated_at) values(owner_session,owner_id,now(),now()),(editor_session,editor_id,now(),now()),(visitor_session,visitor_id,now(),now());
  insert into public.staff_members(email,role) values('wons-owner-rls@example.invalid','owner'),('wons-editor-rls@example.invalid','marketing_editor');
  insert into public.products(id,slug,name,department,category,description,status,is_demo) values(pid,'wons-rls-test-product','RLS fixture','Women','Shirts','Transaction-only fixture','hidden',true);
  insert into public.variants(id,product_id,sku,color,color_hex,size,price_vnd,available_quantity) values(vid,pid,'WONS-RLS-FIXTURE','Ivory','#eee7d7','S',100000,3);
  perform set_config('wons.test.pid',pid::text,true); perform set_config('wons.test.vid',vid::text,true);
  perform set_config('wons.test.owner',jsonb_build_object('sub',owner_id,'role','authenticated','session_id',owner_session)::text,true);
  perform set_config('wons.test.editor',jsonb_build_object('sub',editor_id,'role','authenticated','session_id',editor_session,'user_metadata',jsonb_build_object('role','owner'))::text,true);
  perform set_config('wons.test.visitor',jsonb_build_object('sub',visitor_id,'role','authenticated','session_id',visitor_session,'user_metadata',jsonb_build_object('role','owner'))::text,true);
end $$;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$ begin
  if exists(select 1 from public.products where id=current_setting('wons.test.pid')::uuid) then raise exception 'Anon read hidden product';end if;
  begin insert into public.staff_members(email,role) values('outsider@example.invalid','owner');raise exception 'Anon self-enrolled';exception when insufficient_privilege then null;end;
  begin perform public.admin_save_product('{}');raise exception 'Anon called admin write';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims',current_setting('wons.test.visitor'),true);
set local role authenticated;
do $$ begin
  if private.staff_role() is not null then raise exception 'User metadata granted staff access';end if;
  begin update public.variants set price_vnd=1 where id=current_setting('wons.test.vid')::uuid; if found then raise exception 'Customer changed a price';end if;exception when insufficient_privilege then null;end;
  begin perform public.admin_save_product('{}');raise exception 'Customer saved product';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims',current_setting('wons.test.editor'),true);
set local role authenticated;
do $$
declare p jsonb; result jsonb; changed integer; pid uuid:=current_setting('wons.test.pid')::uuid; vid uuid:=current_setting('wons.test.vid')::uuid; path text;
begin
  if private.staff_role()<>'marketing_editor' then raise exception 'Editor role mismatch';end if;
  if not exists(select 1 from public.products where id=pid and status='hidden') then raise exception 'Editor cannot read hidden product';end if;
  p:=jsonb_build_object('id',pid,'version',1,'slug','wons-rls-test-product','name','Updated by Marketing','department','Women','category','Shirts','description','Updated description','status','published','is_demo',true,'sort_order',0,'variants',jsonb_build_array(jsonb_build_object('id',vid,'sku','WONS-RLS-FIXTURE','color','Ivory','color_hex','#eee7d7','size','S','price_vnd',100000,'sale_price_vnd',80000,'available_quantity',3)),'images','[]'::jsonb);
  result:=public.admin_save_product(p);
  if (result->>'version')::integer<>2 or not exists(select 1 from public.variants where id=vid and sale_price_vnd=80000) then raise exception 'Editor price/publication save failed';end if;
  begin perform public.admin_save_product(p);raise exception 'Stale save succeeded';exception when serialization_failure then null;end;
  p:=jsonb_set(jsonb_set(p,'{version}','2'),'{variants,0,sale_price_vnd}'::text[],'110000');
  begin perform public.admin_save_product(p);raise exception 'Invalid sale price succeeded';exception when check_violation then null;end;
  if (select version from public.products where id=pid)<>2 then raise exception 'Failed save was not atomic';end if;
  update public.staff_members set role='owner' where email='wons-editor-rls@example.invalid';get diagnostics changed=row_count;
  if changed<>0 then raise exception 'Editor self-promoted';end if;
  begin insert into public.staff_members(email,role) values('editor-escalation@example.invalid','owner');raise exception 'Editor added owner';exception when insufficient_privilege then null;end;
  if exists(select 1 from public.activity_log) then raise exception 'Editor read owner audit history';end if;
  path:=pid::text||'/'||gen_random_uuid()::text||'.webp';
  insert into storage.objects(bucket_id,name,metadata) values('product-images',path,'{"mimetype":"image/webp","size":32}');
  insert into public.product_images(product_id,storage_path,alt,sort_order) values(pid,path,'Transaction-only image',0);
  update public.products set status='hidden' where id=pid;
  if (select status from public.products where id=pid)<>'hidden' then raise exception 'Editor could not hide product';end if;
end $$;
reset role;
select set_config('request.jwt.claims',current_setting('wons.test.owner'),true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.staff_members)<>2 then raise exception 'Owner cannot read team';end if;
  if not exists(select 1 from public.activity_log where entity_type='variants' and after_data->>'sale_price_vnd'='80000') then raise exception 'Price history missing';end if;
  insert into public.staff_members(email,display_name,role) values('wons-new-editor@example.invalid','Pending editor','marketing_editor');
  begin update public.staff_members set active=false where email='wons-owner-rls@example.invalid';raise exception 'Last owner disabled';exception when check_violation then null;end;
  update public.staff_members set active=false where email='wons-editor-rls@example.invalid';
end $$;
reset role;
select set_config('request.jwt.claims',current_setting('wons.test.editor'),true);
set local role authenticated;
do $$ begin if private.staff_role() is not null then raise exception 'Disabled editor retained access';end if;end $$;
reset role;
-- Verify session revocation independently of a still-active membership.
update public.staff_members set active=true where email='wons-editor-rls@example.invalid';
delete from auth.sessions where id=(current_setting('wons.test.editor')::jsonb->>'session_id')::uuid;
set local role authenticated;
do $$ begin if private.staff_role() is not null then raise exception 'Revoked session retained access';end if;end $$;
reset role;
set constraints all immediate;
select 'PASS: guest/customer denial, hidden rows, Marketing publish/hide/prices/upload policy, no role escalation, Owner team/history, last Owner, stale/atomic save, disabled staff and revoked sessions' as result;
rollback;
