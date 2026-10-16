-- WONS preview catalog only. This migration does not create orders or payments.
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(name) between 1 and 160),
  department text not null check (department in ('Women', 'Men')),
  category text not null check (category in ('Shirts', 'Dresses', 'Trousers', 'Sets')),
  description text not null,
  status text not null default 'hidden' check (status in ('hidden', 'preview', 'published')),
  is_demo boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (status <> 'preview' or is_demo)
);
create table public.variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  color text not null check (length(color) between 1 and 60),
  color_hex text not null check (color_hex ~ '^#[0-9a-fA-F]{6}$'),
  size text not null check (size in ('XS', 'S', 'M', 'L', 'XL', 'XXL')),
  price_vnd integer not null check (price_vnd > 0),
  available_quantity integer not null default 0 check (available_quantity >= 0),
  unique (product_id, color, size)
);
comment on column public.variants.available_quantity is 'Preview selection limit only for is_demo products; not a stock reservation or live inventory ledger.';
create index products_listing_idx on public.products(status, department, sort_order);
-- The variant unique constraint also indexes product_id for joins and RLS lookups.
alter table public.products enable row level security;
alter table public.variants enable row level security;
revoke all on public.products, public.variants from public, anon, authenticated;
grant select on public.products, public.variants to anon, authenticated;
create policy "Visible catalog is readable" on public.products for select to anon, authenticated using (status in ('preview', 'published'));
create policy "Visible product variants are readable" on public.variants for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.status in ('preview', 'published')));

insert into public.products (slug, name, department, category, description, status, is_demo, sort_order) values
('relaxed-linen-shirt', 'Relaxed Linen Shirt', 'Women', 'Shirts', 'An easy, open silhouette for unhurried mornings. A simple shirt concept to wear on its own or layered into your everyday wardrobe.', 'preview', true, 0),
('square-neck-linen-dress', 'Square-neck Linen Dress', 'Women', 'Dresses', 'A clean neckline and a softly flowing silhouette. An effortless dress concept for the moments that ask for a little less hurry.', 'preview', true, 1),
('everyday-linen-set', 'Everyday Linen Set', 'Women', 'Sets', 'Two easy pieces, one considered look. A relaxed matching-set concept to wear together or make your own, one piece at a time.', 'preview', true, 2),
('mens-linen-resort-shirt', 'Men’s Linen Resort Shirt', 'Men', 'Shirts', 'A relaxed shirt concept with room to move. Clean lines and an open, uncomplicated feel for everyday plans and slower weekends.', 'preview', true, 3),
('mens-relaxed-linen-trousers', 'Men’s Relaxed Linen Trousers', 'Men', 'Trousers', 'An understated trouser concept with an easy leg. A simple foundation for a wardrobe that moves at your pace.', 'preview', true, 4),
('mens-linen-weekend-set', 'Men’s Linen Weekend Set', 'Men', 'Sets', 'A relaxed pairing for days with a little room in them. A matching-set concept shaped around ease, together or apart.', 'preview', true, 5);

insert into public.variants (product_id, sku, color, color_hex, size, price_vnd, available_quantity)
select p.id, upper(p.slug) || '-' || upper(c.color) || '-' || s.size,
  c.color, c.hex, s.size,
  case p.slug when 'relaxed-linen-shirt' then 790000 when 'square-neck-linen-dress' then 1290000 when 'everyday-linen-set' then 1590000 when 'mens-linen-resort-shirt' then 890000 when 'mens-relaxed-linen-trousers' then 1090000 else 1790000 end,
  case when (p.slug = 'mens-linen-resort-shirt' and c.color = 'Sand' and s.size = 'XL') or (p.slug = 'square-neck-linen-dress' and c.color = 'Sand' and s.size = 'L') then 0 else 8 end
from public.products p
cross join (values ('Ivory', '#eee7d7'), ('Sand', '#b6a38a')) c(color, hex)
cross join (values ('S'), ('M'), ('L'), ('XL')) s(size)
where p.is_demo and p.status = 'preview' and (p.department = 'Men' or s.size <> 'XL');
