-- ==============================================================================
-- JACKAL ATLAS — MIGRATION 020: IDENTITY CLEANUP AND ADMIN DELETE LOCK
-- 1. Discord name, avatar and ID on every profile are reset to exactly what the
--    Discord identity says. Profiles without a Discord identity are cleared, so a
--    name or avatar copied from user-editable metadata before 018 cannot survive.
-- 2. Deleting an admin takes the same lock as demoting one, so concurrent deletes
--    and demotions cannot leave the Atlas with no admin.
-- Run AFTER migrations 001-019.
-- ==============================================================================

-- 1. Trusted identity data only (nulls from Discord stay null)
update public.profiles p
set discord_id = i.discord_id,
    discord_username = i.nome,
    avatar_url = i.avatar
from (
  select p2.id,
         d.discord_id, d.nome, d.avatar
  from public.profiles p2
  left join lateral (
    select nullif(coalesce(x.identity_data->>'provider_id', x.identity_data->>'sub', x.provider_id), '') as discord_id,
           public.discord_display_name(x.identity_data) as nome,
           public.discord_avatar_url(x.identity_data) as avatar
    from auth.identities x
    where x.user_id = p2.id and x.provider = 'discord'
    order by x.last_sign_in_at desc nulls last
    limit 1
  ) d on true
) i
where i.id = p.id
  and (p.discord_id is distinct from i.discord_id
       or p.discord_username is distinct from i.nome
       or p.avatar_url is distinct from i.avatar);

-- 2. Admin delete guard serialised with demotion (see guard_profile_updates in 018)
create or replace function public.guard_last_admin_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'admin' then
    perform pg_advisory_xact_lock(hashtext('jackal_atlas_admins'));
    if not exists (select 1 from public.profiles where role = 'admin' and id <> old.id) then
      raise exception 'This is the last administrator and cannot be deleted.';
    end if;
  end if;
  return old;
end;
$$;
