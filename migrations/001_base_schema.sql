-- ==============================================================================
-- JACKAL ATLAS — MIGRAÇÃO 001: SCHEMA BASE, ROLES E PERFIS
-- Projeto Supabase dedicado do Jackal Atlas (Wurm Online Round 2)
-- ==============================================================================

-- 1. Enum de papéis de acesso hierárquico
create type app_role as enum ('pending', 'member', 'officer', 'admin');

-- 2. Tabela de perfis vinculada ao auth.users (Discord OAuth)
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    discord_id text unique,
    nick text unique check (nick ~ '^[A-Za-z0-9_ -]{2,24}$'),
    role app_role not null default 'pending',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Ativar RLS rígida
alter table public.profiles enable row level security;

-- 3. Funções de segurança utilitárias (SECURITY DEFINER com search_path seguro)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_officer()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'officer')
  );
$$;

create or replace function public.is_approved_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'officer', 'member')
  );
$$;

-- 4. Gatilho automático ao registrar usuário via Discord OAuth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_discord_id text;
  v_username text;
  v_count integer;
  v_initial_role app_role := 'pending';
begin
  -- Extrair dados do provedor Discord
  v_discord_id := coalesce(
    new.raw_user_meta_data->>'provider_id',
    new.raw_user_meta_data->>'sub'
  );
  v_username := coalesce(
    new.raw_user_meta_data->>'custom_claims'->>'global_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'user_name'
  );

  -- Se for o primeiríssimo usuário cadastrado no banco, conceder admin automaticamente
  select count(*) into v_count from public.profiles;
  if v_count = 0 then
    v_initial_role := 'admin';
  end if;

  insert into public.profiles (id, discord_id, nick, role)
  values (
    new.id,
    v_discord_id,
    null, -- Jogador deve informar o Nick do Wurm depois
    v_initial_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Trigger anti-escalação de privilégios em profiles
create or replace function public.guard_profile_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Se não for admin, não pode alterar o próprio papel nem IDs
  if not public.is_admin() then
    if new.role <> old.role then
      raise exception 'Apenas administradores podem alterar papéis de usuários.';
    end if;
    if new.discord_id <> old.discord_id then
      raise exception 'Não é permitido alterar o Discord ID.';
    end if;
    if new.id <> old.id then
      raise exception 'Não é permitido alterar o ID do usuário.';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace trigger on_profile_update_guard
  before update on public.profiles
  for each row execute function public.guard_profile_updates();

-- 6. Políticas de RLS para profiles
-- Leitura: Membros aprovados podem listar membros; Usuário pode ver seu próprio perfil sempre
create policy "Perfis visiveis para membros aprovados e proprio usuario"
  on public.profiles
  for select
  using (
    auth.uid() = id
    or public.is_approved_member()
  );

-- Atualização: Usuário pode atualizar o seu próprio perfil (guard_profile_updates impede alterar role)
-- Admin pode atualizar qualquer perfil
create policy "Usuarios editam proprio perfil ou admin edita todos"
  on public.profiles
  for update
  using (
    auth.uid() = id
    or public.is_admin()
  )
  with check (
    auth.uid() = id
    or public.is_admin()
  );
