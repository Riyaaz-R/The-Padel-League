-- Applied to project roqrejjlplrzwavvvmup as "sponsors_and_banner" on 2026-11-11.
-- Sponsors, sponsor tiers, gallery images, sliding-banner items and settings, with row-level security and a storage bucket.
-- Public: read ACTIVE sponsors / ACTIVE banner items inside their date window only.
-- Staff (committee with verified 2FA): everything. Images are stored as WebP in the public bucket 'sponsor-images'.

create table sponsor_tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 40),
  size text not null default 'md' check (size in ('xl','lg','md','sm')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table sponsors (
  id uuid primary key default gen_random_uuid(),
  tier_id uuid references sponsor_tiers on delete restrict,
  name text not null check (length(trim(name)) between 1 and 80),
  description text check (description is null or length(description) <= 1000),
  logo_path text,
  logo_bg text not null default 'light' check (logo_bg in ('light','dark')),
  website text check (website is null or website ~* '^https?://'),
  phone text check (phone is null or length(phone) <= 40),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  address text check (address is null or length(address) <= 300),
  socials jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sponsor_images (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references sponsors on delete cascade,
  path text not null,
  caption text check (caption is null or length(caption) <= 160),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Banner items: deleting a sponsor removes its banner items (the app warns first)
create table banner_items (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid references sponsors on delete cascade,
  message text not null check (length(trim(message)) between 1 and 160),
  logo_path text,
  link_url text check (link_url is null or link_url ~* '^https?://'),
  active boolean not null default true,
  starts_on date,
  ends_on date,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table banner_settings (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default true,
  speed text not null default 'medium' check (speed in ('slow','medium','fast')),
  updated_at timestamptz not null default now()
);
insert into banner_settings default values;

-- sensible starting tiers (rename or change them in the staff area)
insert into sponsor_tiers (name, size, sort_order) values ('Title sponsor', 'xl', 1), ('Gold sponsors', 'lg', 2), ('Silver sponsors', 'md', 3), ('Bronze sponsors', 'sm', 4);

alter table sponsor_tiers enable row level security;
alter table sponsors enable row level security;
alter table sponsor_images enable row level security;
alter table banner_items enable row level security;
alter table banner_settings enable row level security;

create policy public_read_tiers on sponsor_tiers for select using (true);
create policy public_read_sponsors on sponsors for select using (active);
create policy public_read_sponsor_images on sponsor_images for select using (exists (select 1 from sponsors s where s.id = sponsor_images.sponsor_id and s.active));
create policy public_read_banner_items on banner_items for select using (
  active
  and (starts_on is null or starts_on <= (now() at time zone 'Africa/Johannesburg')::date)
  and (ends_on is null or ends_on >= (now() at time zone 'Africa/Johannesburg')::date)
  and (sponsor_id is null or exists (select 1 from sponsors s where s.id = banner_items.sponsor_id and s.active))
);
create policy public_read_banner_settings on banner_settings for select using (true);

create policy staff_all_tiers on sponsor_tiers for all to authenticated using (private.is_committee()) with check (private.is_committee());
create policy staff_all_sponsors on sponsors for all to authenticated using (private.is_committee()) with check (private.is_committee());
create policy staff_all_sponsor_images on sponsor_images for all to authenticated using (private.is_committee()) with check (private.is_committee());
create policy staff_all_banner_items on banner_items for all to authenticated using (private.is_committee()) with check (private.is_committee());
create policy staff_all_banner_settings on banner_settings for all to authenticated using (private.is_committee()) with check (private.is_committee());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sponsor-images', 'sponsor-images', true, 3145728, array['image/webp'])
on conflict (id) do nothing;
create policy sponsor_images_staff_select on storage.objects for select to authenticated using (bucket_id = 'sponsor-images' and private.is_committee());
create policy sponsor_images_staff_insert on storage.objects for insert to authenticated with check (bucket_id = 'sponsor-images' and private.is_committee());
create policy sponsor_images_staff_update on storage.objects for update to authenticated using (bucket_id = 'sponsor-images' and private.is_committee()) with check (bucket_id = 'sponsor-images' and private.is_committee());
create policy sponsor_images_staff_delete on storage.objects for delete to authenticated using (bucket_id = 'sponsor-images' and private.is_committee());
