-- Add an explicit one-size option without changing existing product data or RLS.
alter table public.variants
  drop constraint variants_size_check,
  add constraint variants_size_check check (size in ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free size'));
