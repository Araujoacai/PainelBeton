-- 1. Create Coupons Table
create table public.coupons (
  id uuid default uuid_generate_v4() primary key,
  code text not null unique,
  discount_type text check (discount_type in ('percent', 'fixed')) not null,
  discount_value numeric(10,2) not null,
  active boolean default true,
  expiration_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add Coupon Column to Rentals Table
alter table public.rentals 
add column if not exists coupon_code text,
add column if not exists discount_applied numeric(10,2) default 0;

-- 3. RLS Policies for Coupons
alter table public.coupons enable row level security;

-- Admin: Full Access
create policy "Admin Full Access" on public.coupons 
for all to authenticated 
using (true);

-- Public: Read Only (Only active coupons, optionally restricted to prevent scraping entire list, 
-- but for simplicity we allow read so frontend can validate)
create policy "Public Read Access" on public.coupons 
for select 
using (true);
