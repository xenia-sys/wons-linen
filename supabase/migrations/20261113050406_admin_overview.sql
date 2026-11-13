-- Capture the exact time the Owner closes a delivered COD order. Do not
-- substitute order creation or opening time for historical completions.
alter table public.wons_orders add column completed_at timestamptz;
grant select (completed_at) on public.wons_orders to authenticated;

create function private.record_wons_completion() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at := statement_timestamp();
  end if;
  return new;
end $$;
revoke all on function private.record_wons_completion() from public, anon, authenticated;
create trigger record_wons_completion before update of status on public.wons_orders
  for each row execute function private.record_wons_completion();

create index wons_real_orders_created on public.wons_orders (created_at) where not is_test;
create index wons_real_orders_completed on public.wons_orders (completed_at)
  where not is_test and status = 'completed' and completed_at is not null;

-- Only aggregate counts/amounts leave the database. Preserve the caller's RLS.
create function public.wons_admin_overview(period_days integer)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  today date := (statement_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date;
  first_day date;
  from_time timestamptz;
  to_time timestamptz;
  step_days integer;
  report jsonb;
begin
  if (select private.staff_role()) is distinct from 'owner' then
    raise exception 'Owner access required' using errcode = '42501';
  end if;
  if period_days is null or period_days not in (7, 30, 90) then
    raise exception 'Invalid overview date range' using errcode = '22023';
  end if;
  first_day := today - (period_days - 1);
  from_time := first_day::timestamp at time zone 'Asia/Ho_Chi_Minh';
  to_time := (today + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh';
  step_days := case when period_days = 7 then 1 else 7 end;

  with completed as (
    select ((o.completed_at at time zone 'Asia/Ho_Chi_Minh')::date - first_day) / step_days as bucket,
      sum(o.total_vnd) as revenue_vnd, sum(o.item_count) as units, count(*) as orders
    from public.wons_orders o
    where not o.is_test and o.status = 'completed' and o.completed_at >= from_time and o.completed_at < to_time
    group by 1
  ), series as (
    select first_day + i as start_date, least(first_day + i + (step_days - 1), today) as end_date,
      coalesce(c.revenue_vnd,0) as revenue_vnd, coalesce(c.units,0) as units, coalesce(c.orders,0) as orders
    from generate_series(0, period_days - 1, step_days) as days(i)
    left join completed c on c.bucket = i / step_days
  ), counts as (
    select o.status, count(*) as orders from public.wons_orders o
    where not o.is_test and o.created_at >= from_time and o.created_at < to_time
    group by o.status
  ), inventory as (
    select coalesce(sum(v.available_quantity),0) as units,
      count(*) filter (where v.available_quantity >= 4) as in_stock,
      count(*) filter (where v.available_quantity between 1 and 3) as low_stock,
      count(*) filter (where v.available_quantity = 0) as out_of_stock
    from public.variants v
    join public.products p on p.id = v.product_id
    where p.status = 'published' and not p.is_demo
  )
  select jsonb_build_object(
    'start_date', first_day, 'end_date', today,
    'sales', (select jsonb_build_object('revenue_vnd',sum(s.revenue_vnd), 'units',sum(s.units), 'orders',sum(s.orders)) from series s),
    'series', (select jsonb_agg(to_jsonb(s) order by s.start_date) from series s),
    'order_counts', coalesce((select jsonb_object_agg(c.status,c.orders) from counts c), '{}'::jsonb),
    'inventory', (select to_jsonb(i) from inventory i)
  ) into report;
  return report;
end $$;
revoke all on function public.wons_admin_overview(integer) from public, anon, authenticated;
grant execute on function public.wons_admin_overview(integer) to authenticated;
