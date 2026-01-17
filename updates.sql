-- Create Clients Table
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  phone text,
  email text,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Clients
alter table public.clients enable row level security;

-- Policies (Admin only for now, or public read/admin write if needed)
create policy "Enable read access for all users" on public.clients for select using (true);
create policy "Enable all access for authenticated users" on public.clients for all to authenticated using (true);
