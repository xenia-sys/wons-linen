insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('storefront-images', 'storefront-images', true, 3000000,
  array['image/jpeg','image/png','image/webp','image/avif']);

create table public.storefront_images (
  id text primary key check (id in ('home-hero','home-women','home-men')),
  storage_path text not null unique check (
    split_part(storage_path,'/',1) = id
    and storage_path ~ '^(home-hero|home-women|home-men)/[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}\.(jpg|png|webp|avif)$'
  ),
  alt text not null check (length(btrim(alt)) between 1 and 300)
);
alter table public.storefront_images enable row level security;
revoke all on public.storefront_images from public, anon, authenticated;
grant select on public.storefront_images to anon, authenticated;
grant insert, update, delete on public.storefront_images to authenticated;

create policy "Public reads published storefront covers"
  on public.storefront_images for select to anon, authenticated using (true);
create policy "Owner uploads storefront covers"
  on storage.objects for insert to authenticated with check (
    bucket_id = 'storefront-images' and (select private.staff_role()) = 'owner'
    and name ~ '^(home-hero|home-women|home-men)/[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}\.(jpg|png|webp|avif)$'
  );
create policy "Owner reads storefront cover file metadata"
  on storage.objects for select to authenticated using (
    bucket_id = 'storefront-images' and (select private.staff_role()) = 'owner'
  );
create policy "Owner publishes uploaded storefront covers"
  on public.storefront_images for insert to authenticated with check (
    (select private.staff_role()) = 'owner'
    and exists (
      select 1 from storage.objects o
      where o.bucket_id = 'storefront-images' and o.name = storefront_images.storage_path
    )
  );
create policy "Owner replaces storefront covers"
  on public.storefront_images for update to authenticated using ((select private.staff_role()) = 'owner')
  with check (
    (select private.staff_role()) = 'owner'
    and exists (
      select 1 from storage.objects o
      where o.bucket_id = 'storefront-images' and o.name = storefront_images.storage_path
    )
  );
create policy "Owner restores storefront cover defaults"
  on public.storefront_images for delete to authenticated using ((select private.staff_role()) = 'owner');

create trigger audit_storefront_images after insert or update or delete on public.storefront_images
  for each row execute function private.audit_change();
