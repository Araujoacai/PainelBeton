-- LOCK ADMIN ACCESS
-- Restringe permissões de escrita apenas para o email 'admin@admin.com'

-- 1. Tools Policy Update
drop policy if exists "Allow insert for authenticated users" on public.tools;
drop policy if exists "Allow update for authenticated users" on public.tools;
drop policy if exists "Allow delete for authenticated users" on public.tools;

create policy "Admin Only Insert" on public.tools for insert to authenticated 
with check (auth.jwt() ->> 'email' = 'admin@admin.com');

create policy "Admin Only Update" on public.tools for update to authenticated 
using (auth.jwt() ->> 'email' = 'admin@admin.com');

create policy "Admin Only Delete" on public.tools for delete to authenticated 
using (auth.jwt() ->> 'email' = 'admin@admin.com');

-- 2. Categories Policy Update
drop policy if exists "Allow insert for authenticated users" on public.categories;

create policy "Admin Only Insert Cat" on public.categories for insert to authenticated 
with check (auth.jwt() ->> 'email' = 'admin@admin.com');

-- 3. Coupons Policy Update
drop policy if exists "Admin Full Access" on public.coupons;

create policy "Admin Only Full Access Coupons" on public.coupons for all to authenticated
using (auth.jwt() ->> 'email' = 'admin@admin.com');

-- 4. Storage Policy Update
drop policy if exists "Auth Upload" on storage.objects;
drop policy if exists "Auth Update" on storage.objects;
drop policy if exists "Auth Delete" on storage.objects;

create policy "Admin Only Upload" on storage.objects for insert to authenticated 
with check (bucket_id = 'tools' AND auth.jwt() ->> 'email' = 'admin@admin.com');

create policy "Admin Only Update Storage" on storage.objects for update to authenticated 
using (bucket_id = 'tools' AND auth.jwt() ->> 'email' = 'admin@admin.com');

create policy "Admin Only Delete Storage" on storage.objects for delete to authenticated 
using (bucket_id = 'tools' AND auth.jwt() ->> 'email' = 'admin@admin.com');
