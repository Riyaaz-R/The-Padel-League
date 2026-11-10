-- Applied to project roqrejjlplrzwavvvmup as "app_support_dates_aal2_realtime".
alter table fixtures add column match_date date, add column start_time text, add column corrected_at timestamptz;
update fixtures set match_date = (array['2026-11-13','2026-11-20','2026-11-27','2026-12-04','2026-12-11','2026-12-18'])[week]::date;
alter table fixtures alter column match_date set not null;
create unique index fixtures_season_slot on fixtures (season_id, slot) where slot is not null;

-- staff (committee/scorer) must have passed TOTP (aal2)
create or replace function private.is_committee() returns boolean language sql stable set search_path = public, private as $$
  select coalesce(private.current_role_name() in ('super_admin','committee_admin'), false) and coalesce(auth.jwt()->>'aal','') = 'aal2' $$;
create or replace function private.can_score() returns boolean language sql stable set search_path = public, private as $$
  select coalesce(private.current_role_name() in ('scorer','super_admin','committee_admin'), false) and coalesce(auth.jwt()->>'aal','') = 'aal2' $$;
grant execute on function private.can_score() to authenticated;
revoke execute on function private.can_score() from public, anon;
drop policy scorer_live on live_pairing_state;
create policy scorer_live on live_pairing_state for all to authenticated using (private.can_score()) with check (private.can_score());
create policy staff_update_seasons on seasons for update to authenticated using (private.is_committee()) with check (private.is_committee());
create policy staff_all_groups on groups for all to authenticated using (private.is_committee()) with check (private.is_committee());
create policy staff_all_teams on teams for all to authenticated using (private.is_committee()) with check (private.is_committee());

alter publication supabase_realtime add table fixtures, pairings, pairing_results, live_pairing_state;
