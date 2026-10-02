-- ==============================================================================
-- JACKAL ATLAS — MIGRAÇÃO 002: CONFIGURAÇÃO DO MAPA BASE E CAMADAS
-- Suporta troca independente de imagem ou tiles quando o dump oficial sair
-- ==============================================================================

create table public.map_config (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    mode text not null check (mode in ('grid', 'image', 'tiles')),
    width numeric not null default 4096,
    height numeric not null default 4096,
    origin_x numeric not null default 0,
    origin_y numeric not null default 0,
    tile_url_template text,       -- Template Leaflet {z}/{x}/{y}.png
    base_image_url text,          -- Usado se modo for imagem única
    active boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.map_config enable row level security;

-- Políticas de RLS
create policy "Configuracoes do mapa visiveis para membros aprovados"
  on public.map_config
  for select
  using (public.is_approved_member());

create policy "Apenas administradores gerenciam configuracao do mapa"
  on public.map_config
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Semente padrão com as tiles da Round 1
insert into public.map_config (name, mode, width, height, tile_url_template, active)
values (
  'Jackal Round 1 (Placeholder Oficial R2)',
  'tiles',
  4096,
  4096,
  'https://wurmmaps.xyz/tiles/Jackal/terrain/{z}/{x}/{y}.png',
  true
);
