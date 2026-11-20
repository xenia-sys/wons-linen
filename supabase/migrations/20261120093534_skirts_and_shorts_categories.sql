-- Allow the two new garment categories without changing products or permissions.
alter table public.products
  drop constraint products_category_check,
  add constraint products_category_check check (category in ('Shirts', 'Dresses', 'Skirts', 'Trousers', 'Shorts', 'Sets'));
