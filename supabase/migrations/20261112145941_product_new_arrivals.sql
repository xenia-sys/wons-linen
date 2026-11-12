-- Collection placement is independent of the main department.
alter table public.products add column new_arrival boolean;
comment on column public.products.new_arrival is
  'New Arrivals placement: null = automatic; true = featured; false = excluded.';

-- Reuse the existing authorized, version-checked product save in the same
-- transaction; update only this product's collection placement when it changes.
create function public.admin_save_product_with_arrival(payload jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  saved jsonb;
  placement boolean;
  saved_version integer;
begin
  if payload ? 'new_arrival' and jsonb_typeof(payload->'new_arrival') not in ('boolean','null') then
    raise exception 'Invalid New Arrivals selection' using errcode = '23514';
  end if;
  saved := public.admin_save_product(payload);
  if payload ? 'new_arrival' then
    placement := (payload->>'new_arrival')::boolean;
    update public.products
      set new_arrival = placement
      where id = (saved->>'id')::uuid and new_arrival is distinct from placement
      returning version into saved_version;
    if found then saved := jsonb_set(saved, '{version}', to_jsonb(saved_version)); end if;
  end if;
  return saved;
end $$;
revoke execute on function public.admin_save_product_with_arrival(jsonb) from public, anon;
grant execute on function public.admin_save_product_with_arrival(jsonb) to authenticated;
