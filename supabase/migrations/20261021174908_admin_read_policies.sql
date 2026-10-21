-- Evaluate one SELECT policy per role/table while preserving guest and staff access.
alter policy "Visible catalog is readable" on public.products to anon;
alter policy "Visible product variants are readable" on public.variants to anon;
alter policy "Visible images are readable" on public.product_images to anon;
drop policy "Staff reads hidden products" on public.products;
drop policy "Staff reads all variants" on public.variants;
drop policy "Staff reads all product images" on public.product_images;
create policy "Signed-in catalog is readable" on public.products for select to authenticated
  using (status in ('preview','published') or (select private.staff_role()) in ('owner','marketing_editor'));
create policy "Signed-in variants are readable" on public.variants for select to authenticated
  using ((select private.staff_role()) in ('owner','marketing_editor') or exists(select 1 from public.products p where p.id=product_id and p.status in ('preview','published')));
create policy "Signed-in images are readable" on public.product_images for select to authenticated
  using ((select private.staff_role()) in ('owner','marketing_editor') or exists(select 1 from public.products p where p.id=product_id and p.status in ('preview','published')));
