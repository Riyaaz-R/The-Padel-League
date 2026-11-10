-- The Padel League: core league schema, constraints and RLS.
-- STATUS: the live project (roqrejjlplrzwavvvmup, eu-central-1) runs a hardened version of this file:
--   functions have `set search_path`, staff policies are `to authenticated`, extra policies exist for
--   user_team_roles/disputes/announcements, and the role helpers live in schema `private` (see 0002).
--   The authoritative current schema is the live database; regenerate this file with `supabase db pull`
--   once the Supabase CLI is linked. DO NOT apply this file to a fresh project without 0002 and those edits.
-- The app currently runs on the local JSON store (src/data/store.ts); the Supabase adapter is not built yet.
-- Auction tables and the place_bid() engine come in migration 0002 (Phase 5).

create extension if not exists pgcrypto;

create type division as enum ('ladies','high','low');
create type pairing_slot as enum ('ladies','low','high_1','high_2');
create type fixture_round as enum ('group','qf','sf','final','third','plate_sf','plate_final','plate_third');
create type fixture_status as enum ('scheduled','live','awaiting_confirmation','final','disputed','postponed','cancelled');
create type app_role as enum ('super_admin','committee_admin','scorer','auctioneer','treasurer','captain','owner');

create table seasons (
  id uuid primary key default gen_random_uuid(), name text not null, number int not null unique,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  starts_on date, ends_on date, rules_version int not null default 1,
  settings jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), deleted_at timestamptz
);

create table profiles (
  user_id uuid primary key references auth.users on delete cascade, display_name text not null,
  role app_role not null, person_id uuid, created_at timestamptz not null default now()
);

create table persons (
  id uuid primary key default gen_random_uuid(), first_name text not null, second_name text, corrected_name text,
  name_incomplete boolean not null default false, is_minor boolean not null default false, guardian_consent boolean not null default false,
  photo_path text, photo_consent boolean not null default false,
  phone text, email text, emergency_contact text,         -- never exposed through public views
  created_at timestamptz not null default now(), deleted_at timestamptz
);

create table groups (id uuid primary key default gen_random_uuid(), season_id uuid not null references seasons, name text not null, unique (season_id, name));
create table teams (
  id uuid primary key default gen_random_uuid(), season_id uuid not null references seasons, slug text not null,
  name text not null, short text not null, logo_path text, group_id uuid references groups,
  owner_person_id uuid references persons, captain_person_id uuid references persons, unique (season_id, slug)
);
create table user_team_roles (user_id uuid references auth.users on delete cascade, team_id uuid references teams on delete cascade, role app_role not null check (role in ('captain','owner')), primary key (user_id, team_id, role));

create table season_players (
  id uuid primary key default gen_random_uuid(), season_id uuid not null references seasons, person_id uuid not null references persons,
  team_id uuid references teams, division division not null, price numeric(10,2),
  status text not null default 'approved' check (status in ('registered','approved','in_auction','sold','unsold','withdrawn','replaced')),
  injured boolean not null default false, suspended_until date,
  unique (season_id, person_id)                           -- one team per player per season (rule 2)
);

create table fixtures (
  id uuid primary key default gen_random_uuid(), season_id uuid not null references seasons,
  round fixture_round not null, week int not null check (week between 1 and 6), group_id uuid references groups, slot text,
  home_team uuid not null references teams, away_team uuid not null references teams, check (home_team <> away_team),
  starts_at timestamptz, court text, status fixture_status not null default 'scheduled',
  deciding_winner text check (deciding_winner in ('home','away')), version int not null default 1, created_at timestamptz not null default now()
);
-- each team pair meets once in the group stage
create unique index fixtures_group_pair on fixtures (season_id, least(home_team, away_team), greatest(home_team, away_team)) where round = 'group';

create table pairings (
  id uuid primary key default gen_random_uuid(), fixture_id uuid not null references fixtures on delete cascade, slot pairing_slot not null,
  home_p1 uuid references season_players, home_p2 uuid references season_players, away_p1 uuid references season_players, away_p2 uuid references season_players,
  locked_at timestamptz, unique (fixture_id, slot)
);

create table pairing_results (
  pairing_id uuid primary key references pairings on delete cascade,
  s1_h int not null, s1_a int not null, s1_tb_h int, s1_tb_a int,
  s2_h int not null, s2_a int not null, s2_tb_h int, s2_tb_a int,
  mtb_h int, mtb_a int, outcome text not null default 'normal' check (outcome in ('normal','forfeit_set','forfeit_match','walkover','retired')),
  forced_s1 boolean not null default false, forced_s2 boolean not null default false,
  home_points int not null, away_points int not null,
  -- valid set scores unless the set is a recorded forfeit (6-0, 6-X)
  constraint s1_valid check (forced_s1 or (greatest(s1_h,s1_a),least(s1_h,s1_a)) in ((6,0),(6,1),(6,2),(6,3),(6,4),(7,5),(7,6))),
  constraint s2_valid check (forced_s2 or (greatest(s2_h,s2_a),least(s2_h,s2_a)) in ((6,0),(6,1),(6,2),(6,3),(6,4),(7,5),(7,6))),
  -- match tie-break only when sets are 1-1
  constraint mtb_only_when_split check ((mtb_h is null) = ((s1_h > s1_a) = (s2_h > s2_a)))
);

create table live_pairing_state (
  pairing_id uuid primary key references pairings on delete cascade, set_no int not null, games_h int not null default 0, games_a int not null default 0,
  tiebreak boolean not null default false, serving text, updated_at timestamptz not null default now()
);

create table sanctions (
  id uuid primary key default gen_random_uuid(), season_id uuid not null references seasons, kind text not null check (kind in ('warning','point_penalty','forfeit','suspension')),
  person_id uuid references persons, team_id uuid references teams, fixture_id uuid references fixtures, points int, until date, reason text not null,
  issued_by uuid references auth.users, created_at timestamptz not null default now()
);

create table result_confirmations (fixture_id uuid references fixtures on delete cascade, team_id uuid references teams, user_id uuid references auth.users, action text check (action in ('confirm','dispute')), at timestamptz default now(), primary key (fixture_id, team_id));
create table disputes (id uuid primary key default gen_random_uuid(), fixture_id uuid references fixtures, raised_by uuid references auth.users, body text not null, raised_at timestamptz default now(), window_ends_at timestamptz, outside_window boolean default false, status text default 'open', resolution text);
create table announcements (id uuid primary key default gen_random_uuid(), season_id uuid references seasons, body text not null, created_at timestamptz default now(), expires_at timestamptz);

create table audit_log (id bigint generated always as identity primary key, at timestamptz not null default now(), actor uuid, action text not null, table_name text, row_id text, before jsonb, after jsonb, ip inet, reason text);
-- append-only: block UPDATE/DELETE for everyone, including the service role
create function forbid_mutation() returns trigger language plpgsql as $$ begin raise exception '% is append-only', tg_table_name; end $$;
create trigger audit_log_immutable before update or delete on audit_log for each row execute function forbid_mutation();

-- ---- eligibility triggers (rules section 3), defence in depth behind src/domain ----
create function check_pairing_players() returns trigger language plpgsql as $$
declare d division; pid uuid; slotname pairing_slot := new.slot;
begin
  foreach pid in array array[new.home_p1,new.home_p2,new.away_p1,new.away_p2] loop
    continue when pid is null;
    select division into d from season_players where id = pid;
    if slotname = 'ladies' and d <> 'ladies' then raise exception 'Only ladies may play the Ladies pairing'; end if;
    if slotname = 'low' and d <> 'low' then raise exception 'Only Low players may play the Low pairing (no playing down; ladies only in Ladies)'; end if;
    if slotname in ('high_1','high_2') and d = 'ladies' then raise exception 'Ladies may only play the Ladies pairing'; end if;
  end loop;
  return new;
end $$;
create trigger pairings_eligibility before insert or update on pairings for each row execute function check_pairing_players();

create function check_one_game_per_week() returns trigger language plpgsql as $$
declare wk int; clash int;
begin
  select week into wk from fixtures where id = new.fixture_id;
  select count(*) into clash from pairings p join fixtures f on f.id = p.fixture_id
   where f.week = wk and f.season_id = (select season_id from fixtures where id = new.fixture_id) and p.id is distinct from new.id
     and (p.home_p1 in (new.home_p1,new.home_p2,new.away_p1,new.away_p2) or p.home_p2 in (new.home_p1,new.home_p2,new.away_p1,new.away_p2)
       or p.away_p1 in (new.home_p1,new.home_p2,new.away_p1,new.away_p2) or p.away_p2 in (new.home_p1,new.home_p2,new.away_p1,new.away_p2));
  if clash > 0 then raise exception 'A player may play only one game per game-week'; end if;
  return new;
end $$;
create trigger pairings_one_game_per_week before insert or update on pairings for each row execute function check_one_game_per_week();

-- ---- RLS: deny by default; public sees only verified results through views ----
alter table seasons enable row level security; alter table profiles enable row level security; alter table persons enable row level security;
alter table groups enable row level security; alter table teams enable row level security; alter table user_team_roles enable row level security;
alter table season_players enable row level security; alter table fixtures enable row level security; alter table pairings enable row level security;
alter table pairing_results enable row level security; alter table live_pairing_state enable row level security; alter table sanctions enable row level security;
alter table result_confirmations enable row level security; alter table disputes enable row level security; alter table announcements enable row level security;
alter table audit_log enable row level security;

create function current_role_name() returns app_role language sql stable security definer set search_path = public as $$ select role from profiles where user_id = auth.uid() $$;
create function is_committee() returns boolean language sql stable as $$ select coalesce(current_role_name() in ('super_admin','committee_admin'), false) $$;

create policy public_read_seasons on seasons for select using (deleted_at is null);
create policy public_read_groups on groups for select using (true);
create policy public_read_teams on teams for select using (true);
create policy public_read_fixtures on fixtures for select using (true);
create policy public_read_pairings on pairings for select using (true);
create policy public_read_live on live_pairing_state for select using (true);
create policy public_read_results on pairing_results for select using (exists (select 1 from pairings p join fixtures f on f.id = p.fixture_id where p.id = pairing_id and f.status in ('live','awaiting_confirmation','final')));
create policy public_read_announcements on announcements for select using (expires_at is null or expires_at > now());
create policy staff_all_fixtures on fixtures for all using (is_committee()) with check (is_committee());
create policy staff_all_pairings on pairings for all using (is_committee()) with check (is_committee());
create policy staff_all_results on pairing_results for all using (is_committee()) with check (is_committee());
create policy scorer_live on live_pairing_state for all using (current_role_name() in ('scorer','super_admin','committee_admin')) with check (current_role_name() in ('scorer','super_admin','committee_admin'));
create policy staff_all_sanctions on sanctions for all using (is_committee()) with check (is_committee());
create policy staff_read_audit on audit_log for select using (is_committee());
create policy staff_insert_audit on audit_log for insert with check (auth.uid() is not null);
create policy staff_all_persons on persons for all using (is_committee()) with check (is_committee());
create policy staff_all_season_players on season_players for all using (is_committee()) with check (is_committee());
create policy own_profile on profiles for select using (user_id = auth.uid() or is_committee());
create policy captain_confirm on result_confirmations for insert with check (exists (select 1 from user_team_roles u where u.user_id = auth.uid() and u.team_id = result_confirmations.team_id));
create policy captain_read_confirm on result_confirmations for select using (is_committee() or exists (select 1 from user_team_roles u where u.user_id = auth.uid() and u.team_id = result_confirmations.team_id));

-- Public views hide contact details and mask minors (first name + surname initial unless guardian consent).
create view public_players as
  select sp.id, sp.season_id, sp.team_id, sp.division,
         case when p.is_minor and not p.guardian_consent then left(p.first_name,1) || '.' else coalesce(p.corrected_name, trim(p.first_name || ' ' || coalesce(p.second_name,''))) end as display_name,
         case when p.is_minor and not p.guardian_consent then null else p.photo_path end as photo_path
  from season_players sp join persons p on p.id = sp.person_id where sp.status in ('approved','sold') and p.deleted_at is null;
grant select on public_players to anon, authenticated;
