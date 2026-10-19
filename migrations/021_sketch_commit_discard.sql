-- ==============================================================================
-- JACKAL ATLAS — MIGRATION 021: DISCARD UNMERGED SKETCH COMMITS
-- Permanently deletes a commit that is not on main, with its strokes and erasures.
-- - Authors can discard their own pending or rejected commits (withdraw them).
-- - Officers and admins can discard any pending, rejected or reverted commit.
-- Commits on main (approved) cannot be discarded: revert them first.
-- Run AFTER migrations 001-020.
-- ==============================================================================

create or replace function public.sketch_commit_discard(p_commit uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commit public.sketch_commits;
  v_officer boolean := public.is_officer();
begin
  select * into v_commit from public.sketch_commits where id = p_commit for update;
  if not found then
    raise exception 'Commit not found.';
  end if;
  if v_commit.status = 'approved' then
    raise exception 'This commit is on the main map. Revert it first, then discard it.';
  end if;
  if not v_officer and not (
    v_commit.author = auth.uid()
    and v_commit.status in ('pending', 'rejected')
    and public.is_approved_member()
  ) then
    raise exception 'Only the author (pending or rejected commits) or an officer can discard this commit.';
  end if;

  -- Strokes and erasures go with the commit (on delete cascade)
  delete from public.sketch_commits where id = p_commit;
end;
$$;

revoke all on function public.sketch_commit_discard(uuid) from public, anon;
grant execute on function public.sketch_commit_discard(uuid) to authenticated;
