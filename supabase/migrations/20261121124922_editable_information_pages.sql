-- Two fixed, published storefront pages. Policy pages stay in source.
create table public.information_pages (
  id text primary key check (id in ('our-story', 'client-care')),
  eyebrow text not null check (length(eyebrow) between 1 and 60 and eyebrow ~ '[^[:space:]]' and eyebrow !~ '[[:cntrl:]]'),
  title text not null check (length(title) between 1 and 120 and title ~ '[^[:space:]]' and title !~ '[[:cntrl:]]'),
  body text not null check (length(body) between 1 and 10000 and body ~ '[^[:space:]]'),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);

alter table public.information_pages enable row level security;
revoke all on public.information_pages from public, anon, authenticated;
grant select on public.information_pages to anon, authenticated;
grant update (eyebrow, title, body) on public.information_pages to authenticated;

create policy "Public reads storefront page copy" on public.information_pages
  for select to anon, authenticated using (true);
create policy "Owner publishes storefront page copy" on public.information_pages
  for update to authenticated using ((select private.staff_role()) = 'owner')
  with check ((select private.staff_role()) = 'owner');

create function private.bump_information_page_version() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if (new.eyebrow, new.title, new.body) is distinct from (old.eyebrow, old.title, old.body) then
    new.version := old.version + 1;
    new.updated_at := now();
  end if;
  return new;
end $$;
revoke all on function private.bump_information_page_version() from public, anon, authenticated;

create trigger bump_information_page_version before update on public.information_pages
  for each row execute function private.bump_information_page_version();
create trigger audit_information_page after update on public.information_pages
  for each row execute function private.audit_change();

insert into public.information_pages(id, eyebrow, title, body) values
  ('our-story', 'MEET WONS', 'Linen, at your own pace.', $copy$WONS is taking shape around a simple idea: a wardrobe that leaves a little room to breathe. Easy silhouettes, natural textures and a palette that feels at home in the everyday.

The first edit brings Women and Men into the same conversation, with relaxed shirts, thoughtful sets and simple shapes.

Explore the collection for current styles, colours and product details.$copy$),
  ('client-care', 'CLIENT CARE', 'A little care, in every detail.', $copy$Explore styles, choose colours and sizes, and add available items to your bag. WONS contacts customers by WhatsApp or email to confirm orders.

Each product page lists the available sizes and fabric. For measurements, fit or care advice, contact WONS at linenwons@gmail.com or 0912 562 991 (call, WhatsApp or Zalo) before ordering.

Shipping is free within Vietnam. Product prices include taxes and fees. The only payment method is cash on delivery (COD).$copy$);
