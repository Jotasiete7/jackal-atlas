-- ==============================================================================
-- JACKAL ATLAS — MIGRAÇÃO 005: CONFIGURAÇÕES EDITÁVEIS, MARCOS E DADOS SEMENTES
-- Regras não confirmadas mantidas editáveis via banco para ajuste no dia do evento
-- ==============================================================================

-- 1. Tabela de Alcances de Influência por Nível de Reforço de Beacon
create table public.influence_ranges (
    reinforcement smallint primary key check (reinforcement between 0 and 2),
    range_tiles integer not null,
    notes text,
    updated_at timestamptz not null default now()
);

alter table public.influence_ranges enable row level security;

create policy "Membros leem alcances de influencia"
  on public.influence_ranges for select using (public.is_approved_member());

create policy "Admins editam alcances de influencia"
  on public.influence_ranges for all using (public.is_admin()) with check (public.is_admin());

-- Semente inicial de alcance (valores estimados que serão ajustados após os primeiros testes)
insert into public.influence_ranges (reinforcement, range_tiles, notes)
values 
  (0, 100, 'Beacon recém fundado / sem reforço'),
  (1, 160, 'Beacon reforçado 1 vez'),
  (2, 240, 'Beacon reforçado 2 vezes (máximo)')
on conflict (reinforcement) do nothing;

-- 2. Tabela de Marcos Comunitários (Milestones)
create table public.milestones (
    id integer primary key,
    name text not null,
    description text,
    influence_pct_required numeric,
    reached boolean not null default false,
    unlocks text[] not null default '{}',
    reached_at timestamptz,
    updated_at timestamptz not null default now()
);

alter table public.milestones enable row level security;

create policy "Membros leem marcos"
  on public.milestones for select using (public.is_approved_member());

create policy "Officers e admins atualizam marcos"
  on public.milestones for all using (public.is_officer()) with check (public.is_officer());

-- Semente inicial de marcos da comunidade Jackal Round 2
insert into public.milestones (id, name, description, influence_pct_required, reached, unlocks)
values 
  (1, 'Primeiro Marco Comunitário', 'Desbloqueia Idols místicos e Plinths de suporte com buffs de área', 20.0, false, array['idol', 'idol_plinth']),
  (2, 'Segundo Marco Comunitário', 'Novos itens de crafting e receitas avançadas', 50.0, false, array['advanced_crafting']),
  (3, 'Vitória da Comunidade', 'Liberação das recompensas máximas de transferência para Freedom', 100.0, false, array['full_rewards'])
on conflict (id) do nothing;

-- 3. Tabela de Configurações Dinâmicas da Aplicação
create table public.app_settings (
    key text primary key,
    value jsonb not null,
    description text,
    updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

create policy "Membros leem configuracoes do app"
  on public.app_settings for select using (public.is_approved_member());

create policy "Admins gerenciam configuracoes do app"
  on public.app_settings for all using (public.is_admin()) with check (public.is_admin());

-- Sementes com configurações recomendadas pelo Dossiê Oficial
insert into public.app_settings (key, value, description)
values
  (
    'enabled_kinds',
    '["beacon", "lodestone", "village", "cave", "resource_node", "idol", "idol_plinth", "supply_point", "landmark"]'::jsonb,
    'Tipos de pontos ativos na interface (altar e safe_space desligados por padrão até confirmação)'
  ),
  (
    'mount_slopes',
    '{"weta": 45, "octopede": 65}'::jsonb,
    'Limites máximos de inclinação (slope) para montarias em Jackal'
  ),
  (
    'event_metadata',
    '{"name": "Jackal Round 2", "launch_date": "2026-10-20T12:00:00Z", "guild": "A Guilda"}'::jsonb,
    'Metadados oficiais do evento'
  )
on conflict (key) do nothing;
