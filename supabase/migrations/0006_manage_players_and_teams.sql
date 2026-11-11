-- Applied to project roqrejjlplrzwavvvmup as "manage_players_and_teams" on 2026-11-11.
-- A copy of the affected tables was taken first into schema backup_20261111 (not exposed through the API).

-- 1) team accent colour (optional)
alter table teams add column if not exists colour text check (colour is null or colour ~ '^#[0-9a-fA-F]{6}$');

-- 2) photo buckets: team logos and player photos (public by URL, committee-only writes, no listing for anyone else)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('team-logos', 'team-logos', true, 2097152, array['image/webp']),
  ('player-photos', 'player-photos', true, 3145728, array['image/webp'])
on conflict (id) do nothing;

create policy team_logos_staff_select on storage.objects for select to authenticated using (bucket_id = 'team-logos' and private.is_committee());
create policy team_logos_staff_insert on storage.objects for insert to authenticated with check (bucket_id = 'team-logos' and private.is_committee());
create policy team_logos_staff_update on storage.objects for update to authenticated using (bucket_id = 'team-logos' and private.is_committee()) with check (bucket_id = 'team-logos' and private.is_committee());
create policy team_logos_staff_delete on storage.objects for delete to authenticated using (bucket_id = 'team-logos' and private.is_committee());

create policy player_photos_staff_select on storage.objects for select to authenticated using (bucket_id = 'player-photos' and private.is_committee());
create policy player_photos_staff_insert on storage.objects for insert to authenticated with check (bucket_id = 'player-photos' and private.is_committee());
create policy player_photos_staff_update on storage.objects for update to authenticated using (bucket_id = 'player-photos' and private.is_committee()) with check (bucket_id = 'player-photos' and private.is_committee());
create policy player_photos_staff_delete on storage.objects for delete to authenticated using (bucket_id = 'player-photos' and private.is_committee());

-- 3) split stored full names into first name + surname so both can be edited separately.
--    The last word becomes the surname, keeping lower-case particles (van, de, du ...) with it. Single names stay single.
--    The displayed name (first || ' ' || surname) is unchanged. Nothing is deleted; old values are in backup_20261111.persons.
update persons p
set first_name = x.m[1], second_name = x.m[2]
from (
  select id, regexp_match(first_name, '^(.*?)\s+((?:(?:van|von|de|du|da|le|la|di|der|den|ten|ter)\s+)*\S+)$', 'i') as m
  from persons
  where second_name is null and corrected_name is null and position(' ' in first_name) > 0
) x
where p.id = x.id and x.m is not null;
