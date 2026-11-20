-- Isolated PostgreSQL fixtures only; never execute against hosted Supabase.
begin;
do $$
declare editor_id uuid := gen_random_uuid(); session_id uuid := gen_random_uuid();
begin
  insert into auth.users(id,email,email_confirmed_at) values(editor_id,'category-editor@example.invalid',now());
  insert into auth.sessions(id,user_id) values(session_id,editor_id);
  insert into public.staff_members(email,role) values('category-editor@example.invalid','marketing_editor');
  perform set_config('wons.category.editor',jsonb_build_object('sub',editor_id,'session_id',session_id)::text,true);
end $$;

set local role authenticated;
select set_config('request.jwt.claims',current_setting('wons.category.editor'),true);
do $$
declare
  category_name text;
  pid uuid;
  vid uuid;
  photo_path text;
  payload jsonb;
  saved jsonb;
begin
  foreach category_name in array array['Skirts','Shorts'] loop
    payload := jsonb_build_object('slug','fixture-'||lower(category_name),'name','Fixture '||category_name,
      'category',category_name,'department','Women','description','Synthetic only',
      'status','hidden','is_demo',false,'sort_order',0,'images','[]'::jsonb,
      'variants',jsonb_build_array(jsonb_build_object(
        'sku','FIXTURE-'||category_name,'color','Ivory','color_hex','#ffffff',
        'size','Free size','price_vnd',790000,'available_quantity',3)));
    saved := public.admin_save_product_with_arrival(payload);
    pid := (saved->>'id')::uuid;
    select id into strict vid from public.variants where product_id=pid;
    photo_path := pid::text||'/'||gen_random_uuid()::text||'.webp';
    insert into storage.objects(bucket_id,name,metadata)
      values('product-images',photo_path,'{"mimetype":"image/webp","size":32}');
    payload := payload||jsonb_build_object('id',pid,'version',saved->'version','status','published',
      'images',jsonb_build_array(jsonb_build_object('storage_path',photo_path,'alt','Fixture photo','color',null)));
    payload := jsonb_set(payload,'{variants,0,id}',to_jsonb(vid));
    saved := public.admin_save_product_with_arrival(payload);
    if not exists(select 1 from public.products where id=pid and category=category_name and status='published') then
      raise exception 'Could not save and publish category %', category_name;
    end if;
    payload := jsonb_set(payload,'{version}',saved->'version');
    begin
      perform public.admin_save_product_with_arrival(payload||'{"category":"Unknown"}'::jsonb);
      raise exception 'Unsupported category was accepted';
    exception when check_violation then null;
    end;
    if not exists(select 1 from public.products where id=pid and category=category_name
      and version=(saved->>'version')::int) then
      raise exception 'Rejected category edit changed the product';
    end if;
  end loop;
end $$;
set constraints all immediate;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$
begin
  if (select count(distinct category) from public.products
    where slug in ('fixture-skirts','fixture-shorts') and category in ('Skirts','Shorts')) <> 2 then
    raise exception 'Storefront cannot read both new categories';
  end if;
end $$;
rollback;
select 'PASS: Marketing saves/publishes Skirts and Shorts, invalid category edit is atomic, both categories readable on storefront' as result;
