-- Product administration. No orders, checkout, payment or privileged API keys.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table public.staff_members (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(trim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  display_name text not null default '' check (length(display_name) <= 120),
  role text not null check (role in ('owner','marketing_editor')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.staff_members enable row level security;

-- Authoritative email + a live Auth session; never trust user_metadata or an app-supplied role.
create function private.staff_role() returns text language sql stable security definer set search_path = '' as $$
  select m.role from public.staff_members m
  join auth.users u on lower(u.email) = m.email
  join auth.sessions s on s.user_id = u.id and s.id::text = (select auth.jwt()->>'session_id')
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null
    and m.active and (s.not_after is null or s.not_after > now()) limit 1
$$;
revoke all on function private.staff_role() from public;
grant execute on function private.staff_role() to anon, authenticated;

create policy "Owner reads team" on public.staff_members for select to authenticated using ((select private.staff_role()) = 'owner');
create policy "Owner adds team" on public.staff_members for insert to authenticated with check ((select private.staff_role()) = 'owner');
create policy "Owner updates team" on public.staff_members for update to authenticated using ((select private.staff_role()) = 'owner') with check ((select private.staff_role()) = 'owner');
revoke all on public.staff_members from public, anon, authenticated;
grant select, insert, update on public.staff_members to authenticated;

create function public.staff_profile() returns jsonb language sql stable security invoker set search_path = '' as $$
  select case when (select private.staff_role()) is null then null else jsonb_build_object('role',(select private.staff_role())) end
$$;
revoke all on function public.staff_profile() from public, anon;
grant execute on function public.staff_profile() to authenticated;

create function private.keep_owner() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(9281742);
  if old.role = 'owner' and old.active and (not new.active or new.role <> 'owner' or new.email <> old.email)
     and not exists (select 1 from public.staff_members where role='owner' and active and id <> old.id) then
    raise exception 'The last active Owner must remain available.' using errcode='23514';
  end if;
  return new;
end $$;
revoke all on function private.keep_owner() from public, anon, authenticated;
create trigger keep_owner before update on public.staff_members for each row execute function private.keep_owner();

alter table public.products add column version integer not null default 1, add column updated_at timestamptz not null default now();
alter table public.variants add column sale_price_vnd integer check (sale_price_vnd > 0 and sale_price_vnd < price_vnd);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique check (storage_path ~ '^[a-f0-9-]+/[a-f0-9-]+\.(jpg|png|webp|avif)$' and split_part(storage_path,'/',1) = product_id::text),
  alt text not null check (length(trim(alt)) between 1 and 300),
  color text check (length(color) between 1 and 60),
  sort_order integer not null default 0
);
create index product_images_product_order_idx on public.product_images(product_id, sort_order);
alter table public.product_images enable row level security;
revoke all on public.product_images from public, anon, authenticated;
grant select on public.product_images to anon, authenticated;
grant insert, update, delete on public.product_images to authenticated;
create policy "Visible images are readable" on public.product_images for select to anon, authenticated using (exists(select 1 from public.products p where p.id=product_id and p.status in ('preview','published')));
create policy "Staff reads all product images" on public.product_images for select to authenticated using ((select private.staff_role()) in ('owner','marketing_editor'));
create policy "Staff creates product images" on public.product_images for insert to authenticated with check ((select private.staff_role()) in ('owner','marketing_editor'));
create policy "Staff updates product images" on public.product_images for update to authenticated using ((select private.staff_role()) in ('owner','marketing_editor')) with check ((select private.staff_role()) in ('owner','marketing_editor'));
create policy "Staff removes product image links" on public.product_images for delete to authenticated using ((select private.staff_role()) in ('owner','marketing_editor'));

grant insert, update on public.products to authenticated;
grant insert, update, delete on public.variants to authenticated;
create policy "Staff reads hidden products" on public.products for select to authenticated using ((select private.staff_role()) in ('owner','marketing_editor'));
create policy "Staff creates products" on public.products for insert to authenticated with check ((select private.staff_role()) in ('owner','marketing_editor'));
create policy "Staff edits and publishes products" on public.products for update to authenticated using ((select private.staff_role()) in ('owner','marketing_editor')) with check ((select private.staff_role()) in ('owner','marketing_editor'));
create policy "Staff reads all variants" on public.variants for select to authenticated using ((select private.staff_role()) in ('owner','marketing_editor'));
create policy "Staff creates variants" on public.variants for insert to authenticated with check ((select private.staff_role()) in ('owner','marketing_editor'));
create policy "Staff edits prices and availability" on public.variants for update to authenticated using ((select private.staff_role()) in ('owner','marketing_editor')) with check ((select private.staff_role()) in ('owner','marketing_editor'));
create policy "Staff removes variants" on public.variants for delete to authenticated using ((select private.staff_role()) in ('owner','marketing_editor'));

create function private.bump_product_version() returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.version := old.version+1; new.updated_at := now(); return new; end $$;
revoke all on function private.bump_product_version() from public, anon, authenticated;
create trigger bump_product_version before update on public.products for each row execute function private.bump_product_version();

create table public.activity_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_email text,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index activity_log_created_idx on public.activity_log(created_at desc);
alter table public.activity_log enable row level security;
revoke all on public.activity_log from public, anon, authenticated;
grant select on public.activity_log to authenticated;
create policy "Owner reads activity" on public.activity_log for select to authenticated using ((select private.staff_role())='owner');
create function private.audit_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='UPDATE' and to_jsonb(old)=to_jsonb(new) then return new; end if;
  insert into public.activity_log(actor_id,actor_email,entity_type,entity_id,action,before_data,after_data)
  values ((select auth.uid()),(select email from auth.users where id=(select auth.uid())),tg_table_name,case when tg_op='DELETE' then old.id::text else new.id::text end,tg_op,
    case when tg_op='INSERT' then null else to_jsonb(old) end,
    case when tg_op='DELETE' then null else to_jsonb(new) end);
  return coalesce(new,old);
end $$;
revoke all on function private.audit_change() from public, anon, authenticated;
create trigger audit_products after insert or update on public.products for each row execute function private.audit_change();
create trigger audit_variants after insert or update or delete on public.variants for each row execute function private.audit_change();
create trigger audit_images after insert or update or delete on public.product_images for each row execute function private.audit_change();
create trigger audit_team after insert or update on public.staff_members for each row execute function private.audit_change();

-- One transaction for product, variants and ordered image links; stale editors cannot overwrite a newer save.
create function public.admin_save_product(payload jsonb) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare pid uuid; v jsonb; img jsonb; vid uuid; image_id uuid; ord integer:=0; current_version integer; saved_ids uuid[]:='{}'; image_ids uuid[]:='{}';
begin
  if (select private.staff_role()) is null then raise exception 'Staff access required' using errcode='42501'; end if;
  if coalesce(jsonb_typeof(payload->'variants'),'') <> 'array' then raise exception 'Variants are required' using errcode='23514'; end if;
  if jsonb_array_length(payload->'variants') not between 1 and 100 then raise exception 'Add between 1 and 100 variants' using errcode='23514'; end if;
  if coalesce(jsonb_typeof(payload->'images'),'') <> 'array' then raise exception 'Images are required' using errcode='23514'; end if;
  if jsonb_array_length(payload->'images') > 20 then raise exception 'Use up to 20 images' using errcode='23514'; end if;
  if payload->>'status'='published' and not (payload->>'is_demo')::boolean and jsonb_array_length(payload->'images')=0 then raise exception 'Add product photography before publishing' using errcode='23514'; end if;
  pid := nullif(payload->>'id','')::uuid;
  if pid is null then
    insert into public.products(slug,name,department,category,description,status,is_demo,sort_order)
    values(payload->>'slug',payload->>'name',payload->>'department',payload->>'category',payload->>'description',payload->>'status',(payload->>'is_demo')::boolean,coalesce((payload->>'sort_order')::integer,0)) returning id into pid;
  else
    select version into current_version from public.products where id=pid for update;
    if not found then raise exception 'Product not found' using errcode='P0002'; end if;
    if payload->>'version' is null or current_version <> (payload->>'version')::integer then raise exception 'This product changed. Reload before saving again.' using errcode='40001'; end if;
    update public.products set slug=payload->>'slug',name=payload->>'name',department=payload->>'department',category=payload->>'category',description=payload->>'description',status=payload->>'status',is_demo=(payload->>'is_demo')::boolean,sort_order=coalesce((payload->>'sort_order')::integer,0) where id=pid;
  end if;
  for v in select value from jsonb_array_elements(payload->'variants') loop
    vid := coalesce(nullif(v->>'id','')::uuid,gen_random_uuid());
    if exists(select 1 from public.variants where id=vid and product_id<>pid) then raise exception 'Variant does not belong to this product' using errcode='23514'; end if;
    insert into public.variants(id,product_id,sku,color,color_hex,size,price_vnd,sale_price_vnd,available_quantity)
    values(vid,pid,v->>'sku',v->>'color',v->>'color_hex',v->>'size',(v->>'price_vnd')::integer,nullif(v->>'sale_price_vnd','')::integer,(v->>'available_quantity')::integer)
    on conflict(id) do update set sku=excluded.sku,color=excluded.color,color_hex=excluded.color_hex,size=excluded.size,price_vnd=excluded.price_vnd,sale_price_vnd=excluded.sale_price_vnd,available_quantity=excluded.available_quantity;
    saved_ids:=array_append(saved_ids,vid);
  end loop;
  delete from public.variants where product_id=pid and not (id=any(saved_ids));
  for img in select value from jsonb_array_elements(payload->'images') loop
    if not exists(select 1 from storage.objects where bucket_id='product-images' and name=img->>'storage_path') then raise exception 'An image has not finished uploading' using errcode='23514'; end if;
    image_id:=coalesce(nullif(img->>'id','')::uuid,gen_random_uuid());
    if exists(select 1 from public.product_images where id=image_id and product_id<>pid) then raise exception 'Image does not belong to this product' using errcode='23514'; end if;
    insert into public.product_images(id,product_id,storage_path,alt,color,sort_order) values(image_id,pid,img->>'storage_path',img->>'alt',nullif(img->>'color',''),ord)
    on conflict(id) do update set storage_path=excluded.storage_path,alt=excluded.alt,color=excluded.color,sort_order=excluded.sort_order;
    image_ids:=array_append(image_ids,image_id); ord:=ord+1;
  end loop;
  delete from public.product_images where product_id=pid and not (id=any(image_ids));
  return (select jsonb_build_object('id',id,'version',version) from public.products where id=pid);
end $$;
revoke all on function public.admin_save_product(jsonb) from public, anon;
grant execute on function public.admin_save_product(jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp','image/avif']);
create policy "Staff uploads product photography" on storage.objects for insert to authenticated with check (bucket_id='product-images' and (select private.staff_role()) in ('owner','marketing_editor') and exists(select 1 from public.products p where p.id::text=split_part(storage.objects.name,'/',1)));
create policy "Staff reads product photography metadata" on storage.objects for select to authenticated using (bucket_id='product-images' and (select private.staff_role()) in ('owner','marketing_editor'));
create function private.check_published_product() returns trigger language plpgsql security invoker set search_path='' as $$
declare pid uuid;
begin
  pid := (case when tg_table_name='products' then coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id') else coalesce(to_jsonb(new)->>'product_id',to_jsonb(old)->>'product_id') end)::uuid;
  if exists(select 1 from public.products where id=pid and status='published' and not is_demo) and
    (not exists(select 1 from public.variants where product_id=pid) or not exists(select 1 from public.product_images where product_id=pid)) then
    raise exception 'Published products require variants and photography' using errcode='23514';
  end if;
  return null;
end $$;
revoke all on function private.check_published_product() from public,anon,authenticated;
create constraint trigger published_product_complete after insert or update on public.products deferrable initially deferred for each row execute function private.check_published_product();
create constraint trigger published_variants_complete after delete on public.variants deferrable initially deferred for each row execute function private.check_published_product();
create constraint trigger published_images_complete after delete on public.product_images deferrable initially deferred for each row execute function private.check_published_product();
-- Object names are immutable. Removing an image from a gallery removes its link, not its original file.
