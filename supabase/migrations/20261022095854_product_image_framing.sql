-- Optional, non-destructive framing. NULL preserves the existing image presentation.
-- Coordinates are percentages of the available crop; zoom is limited to 100–300%.
alter table public.product_images add column framing jsonb;
alter table public.product_images add constraint product_images_framing_valid check (
  framing is null or case when
    jsonb_typeof(framing) = 'object'
    and framing ?& array['x','y','zoom']
    and framing - array['x','y','zoom'] = '{}'::jsonb
    and jsonb_typeof(framing->'x') = 'number'
    and jsonb_typeof(framing->'y') = 'number'
    and jsonb_typeof(framing->'zoom') = 'number'
  then (framing->>'x')::numeric between 0 and 100
    and (framing->>'y')::numeric between 0 and 100
    and (framing->>'zoom')::numeric between 1 and 3
  else false end
);
comment on column public.product_images.framing is
  'Optional 4:5 framing: {x: 0..100, y: 0..100, zoom: 1..3}. NULL uses the original presentation. Source files are unchanged.';

-- Preserve current RLS, session checks, optimistic locking and atomic saves.
-- Older clients that omit framing retain a previously saved crop. Explicit NULL resets it.
create or replace function public.admin_save_product(payload jsonb) returns jsonb language plpgsql security invoker set search_path = '' as $$
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
    insert into public.product_images(id,product_id,storage_path,alt,color,sort_order,framing)
    values(image_id,pid,img->>'storage_path',img->>'alt',nullif(img->>'color',''),ord,
      case when img ? 'framing' then nullif(img->'framing','null'::jsonb)
        else (select framing from public.product_images where id=image_id) end)
    on conflict(id) do update set storage_path=excluded.storage_path,alt=excluded.alt,color=excluded.color,sort_order=excluded.sort_order,framing=excluded.framing;
    image_ids:=array_append(image_ids,image_id); ord:=ord+1;
  end loop;
  delete from public.product_images where product_id=pid and not (id=any(image_ids));
  return (select jsonb_build_object('id',id,'version',version) from public.products where id=pid);
end $$;
revoke all on function public.admin_save_product(jsonb) from public, anon;
grant execute on function public.admin_save_product(jsonb) to authenticated;

