-- Trashed products stay linked to variants, photography, and existing orders.
alter table public.products drop constraint products_status_check,
  add constraint products_status_check check (status in ('hidden', 'preview', 'published', 'archived'));

-- Keep existing staff reads for activity and discount assignments. Public
-- policies and checkout already allow only published or preview products.
alter policy "Staff edits and publishes products" on public.products
  using (
    (select private.staff_role()) = 'owner'
    or (status <> 'archived' and (select private.staff_role()) = 'marketing_editor')
  );

create function private.guard_product_trash() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'archived' then
      raise exception 'Create a product before moving it to the trash' using errcode = '23514';
    end if;
  elsif new.status is distinct from old.status and (new.status = 'archived' or old.status = 'archived') then
    if (select private.staff_role()) is distinct from 'owner' then
      raise exception 'Owner access required' using errcode = '42501';
    end if;
    if old.status = 'archived' and new.status <> 'hidden' then
      raise exception 'Restore trashed products as hidden drafts' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_product_trash() from public, anon, authenticated;
create trigger guard_product_trash before insert or update of status on public.products
  for each row execute function private.guard_product_trash();
