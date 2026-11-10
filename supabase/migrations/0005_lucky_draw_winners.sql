-- Applied to project roqrejjlplrzwavvvmup as "lucky_draw_winners" and "lucky_draw_staff_can_read_own_bucket".
create table lucky_draw_winners (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons,
  week int not null check (week between 1 and 6),
  winner_name text not null check (length(trim(winner_name)) between 1 and 80),
  caption text check (caption is null or length(caption) <= 200),
  photo_path text,
  -- POPIA: a winner's name and photo are only stored once the winner has agreed to it being shown
  consent_confirmed boolean not null check (consent_confirmed),
  announced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (season_id, week)
);
alter table lucky_draw_winners enable row level security;
create policy public_read_winners on lucky_draw_winners for select using (true);
create policy staff_all_winners on lucky_draw_winners for all to authenticated using (private.is_committee()) with check (private.is_committee());

-- public bucket for winner photos (served by URL; no listing for the public), committee-only writes, WebP only, 3 MB max
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lucky-draw', 'lucky-draw', true, 3145728, array['image/webp'])
on conflict (id) do nothing;
create policy lucky_draw_staff_insert on storage.objects for insert to authenticated with check (bucket_id = 'lucky-draw' and private.is_committee());
create policy lucky_draw_staff_update on storage.objects for update to authenticated using (bucket_id = 'lucky-draw' and private.is_committee()) with check (bucket_id = 'lucky-draw' and private.is_committee());
create policy lucky_draw_staff_delete on storage.objects for delete to authenticated using (bucket_id = 'lucky-draw' and private.is_committee());
-- Storage deletes and replacements also need SELECT. Committee only.
create policy lucky_draw_staff_select on storage.objects for select to authenticated using (bucket_id = 'lucky-draw' and private.is_committee());
