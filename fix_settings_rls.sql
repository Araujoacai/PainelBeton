-- CORREÇÃO RLS: TABELA SETTINGS
-- Este script corrige o erro de permissão ao salvar configurações e garante que o checkout funcione.

-- 1. Habilitar RLS (caso não esteja)
alter table public.settings enable row level security;

-- 2. Remover políticas antigas para evitar conflitos
drop policy if exists "Enable read access for all users" on public.settings;
drop policy if exists "Enable insert for authenticated users only" on public.settings;
drop policy if exists "Enable update for authenticated users only" on public.settings;
drop policy if exists "Admin Only Settings" on public.settings;
drop policy if exists "Public Read Settings" on public.settings;

-- 3. CRIAR NOVAS POLÍTICAS

-- LEITURA: Pública
-- Motivo: O checkout (site público) precisa ler o número do WhatsApp para gerar o link.
create policy "Public Read Settings" 
on public.settings for select 
using (true);

-- ESCRITA (Insert/Update): Apenas Admin
-- Motivo: Apenas o dono pode mudar o número do Zap ou nome da empresa.
create policy "Admin Only Insert Settings" 
on public.settings for insert 
to authenticated 
with check (auth.jwt() ->> 'email' = 'admin@admin.com');

create policy "Admin Only Update Settings" 
on public.settings for update 
to authenticated 
using (auth.jwt() ->> 'email' = 'admin@admin.com');

-- 4. BÔNUS: Garantir que a tabela RENTALS (Aluguéis) permita criação pública
-- Caso contrário, o checkout vai falhar se o RLS estiver ativo nela sem policy pública.
-- Se já existir policy, isso não atrapalha.
alter table public.rentals enable row level security;

create policy "Public Create Rentals" 
on public.rentals for insert 
with check (true);

create policy "Public Create Rental Items" 
on public.rental_items for insert 
with check (true);

-- Admin vê tudo nos aluguéis
create policy "Admin Full Access Rentals" 
on public.rentals for all 
to authenticated 
using (auth.jwt() ->> 'email' = 'admin@admin.com');
