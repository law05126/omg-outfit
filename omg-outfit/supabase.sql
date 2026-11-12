-- Run in Supabase > SQL Editor
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null, category text not null, price numeric(10,2) not null,
  description text, image_url text, sizes text[] default '{}',
  in_stock boolean default true, created_at timestamptz default now());
create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null, phone text not null, note text,
  items jsonb not null, total numeric(10,2) not null,
  status text default 'new', created_at timestamptz default now());
alter table products enable row level security;
alter table orders enable row level security;
create policy "anyone views products" on products for select using (true);
create policy "staff manage products" on products for all to authenticated using (true) with check (true);
create policy "anyone places order" on orders for insert with check (true);
create policy "staff view orders" on orders for select to authenticated using (true);
create policy "staff update orders" on orders for update to authenticated using (true);
alter publication supabase_realtime add table orders;
insert into storage.buckets (id, name, public) values ('products','products',true);
create policy "public read images" on storage.objects for select using (bucket_id='products');
create policy "staff upload images" on storage.objects for insert to authenticated with check (bucket_id='products');
-- Then: Authentication > Users > Add user (the store's login for /#/admin)
