-- Revoke workspace membership only. Keep Auth accounts and prior audit entries.
grant delete on public.staff_members to authenticated;
create policy "Owner removes team" on public.staff_members for delete to authenticated
  using ((select private.staff_role()) = 'owner');

create or replace function private.keep_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  removes_owner boolean;
begin
  perform pg_catalog.pg_advisory_xact_lock(9281742);
  if tg_op = 'DELETE' then
    if exists (select 1 from auth.users u where u.id = (select auth.uid()) and lower(u.email) = old.email) then
      raise exception 'You cannot remove your own admin access.' using errcode = 'WN005';
    end if;
    removes_owner := true;
  else
    removes_owner := not new.active or new.role <> 'owner' or new.email <> old.email;
  end if;
  if old.role = 'owner' and old.active and removes_owner
     and not exists (select 1 from public.staff_members where role = 'owner' and active and id <> old.id) then
    raise exception 'The last active Owner must remain available.' using errcode = '23514';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger keep_owner_on_remove before delete on public.staff_members
  for each row execute function private.keep_owner();
create trigger audit_team_removal after delete on public.staff_members
  for each row execute function private.audit_change();

-- Add fulfillment states to the existing inbox without rewriting any order.
alter table public.wons_orders
  drop constraint wons_orders_status_check,
  add constraint wons_orders_status_check check
    (status in ('pending','confirmed','packed','shipped','delivered','completed','cancelled'));

create or replace function private.manage_order(order_id uuid, order_action text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  target public.wons_orders%rowtype;
  item record;
  product_ids uuid[];
  next_status text;
begin
  if (select auth.uid()) is null or (select private.staff_role()) is distinct from 'owner' then
    raise exception 'Owner access required' using errcode = '42501';
  end if;
  select * into target from public.wons_orders where id = order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  if order_action = 'seen' then
    update public.wons_orders set seen_at = now() where id = order_id and seen_at is null;
    return target.status;
  end if;
  if order_action is null or order_action not in ('confirm','pack','ship','deliver','complete','cancel') then
    raise exception 'Invalid order action' using errcode = '22023';
  end if;
  next_status := case
    when order_action = 'confirm' and target.status = 'pending' then 'confirmed'
    when order_action = 'pack' and target.status = 'confirmed' then 'packed'
    when order_action = 'ship' and target.status = 'packed' then 'shipped'
    when order_action = 'deliver' and target.status = 'shipped' then 'delivered'
    when order_action = 'complete' and target.status = 'delivered' then 'completed'
    when order_action = 'cancel' and target.status in ('pending','confirmed','packed') then 'cancelled'
  end;
  if next_status is null then
    raise exception 'Order status does not allow this action' using errcode = 'WN004';
  end if;
  if order_action = 'cancel' and not target.is_test then
    select array_agg(distinct v.product_id) into product_ids from public.variants v
      join jsonb_array_elements(target.lines) x(j) on v.id = (j->>'variantId')::uuid;
    perform p.id from public.products p where p.id = any(product_ids) order by p.id for update;
    for item in select j from jsonb_array_elements(target.lines) x(j) order by j->>'variantId' loop
      update public.variants set available_quantity = available_quantity + (item.j->>'quantity')::int
      where id = (item.j->>'variantId')::uuid and product_id = any(product_ids);
    end loop;
    update public.products set updated_at = now() where id = any(product_ids);
  end if;
  update public.wons_orders set status = next_status,
    seen_at = coalesce(seen_at, now()) where id = order_id returning status into target.status;
  return target.status;
end $$;
