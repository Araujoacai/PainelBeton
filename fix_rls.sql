-- CORREÇÃO DE POLÍTICAS RLS (Row Level Security)

-- 1. Políticas para FERRAMENTAS (Tools)
-- Primeiro removemos políticas antigas para evitar conflitos
drop policy if exists "Enable insert for authenticated users only" on public.tools;
drop policy if exists "Enable update for authenticated users only" on public.tools;
drop policy if exists "Enable delete for authenticated users only" on public.tools;
drop policy if exists "Enable insert for all users" on public.tools;

-- Criamos novas políticas mais permissivas para usuários logados
create policy "Allow insert for authenticated users" on public.tools for insert to authenticated with check (true);
create policy "Allow update for authenticated users" on public.tools for update to authenticated using (true);
create policy "Allow delete for authenticated users" on public.tools for delete to authenticated using (true);

-- 2. Políticas para CATEGORIAS (Categories)
drop policy if exists "Enable insert for authenticated users only" on public.categories;
drop policy if exists "Enable update for authenticated users only" on public.categories;

-- Permitir inserir categorias (para aquele modal novo)
create policy "Allow insert for authenticated users" on public.categories for insert to authenticated with check (true);

-- 3. Políticas para STORAGE (Imagens)
-- Garante que o bucket 'tools' existe e é publico
insert into storage.buckets (id, name, public) values ('tools', 'tools', true) on conflict (id) do nothing;

-- Permite upload de imagens para qualquer um autenticado
drop policy if exists "Auth Upload" on storage.objects;
create policy "Auth Upload" on storage.objects for insert to authenticated with check ( bucket_id = 'tools' );

-- Permite update/delete de imagens
create policy "Auth Update" on storage.objects for update to authenticated using ( bucket_id = 'tools' );
create policy "Auth Delete" on storage.objects for delete to authenticated using ( bucket_id = 'tools' );
