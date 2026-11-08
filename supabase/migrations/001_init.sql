-- ElderSafe Guardian — shared Supabase PostgreSQL schema
-- Run in Supabase SQL Editor (or via supabase db push).
-- Elders are device-key identified (no Auth). Volunteers/admins use Supabase Auth + profiles.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- elders
-- ---------------------------------------------------------------------------

create table if not exists public.elders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age integer not null check (age > 0),
  phone text not null,
  address text not null,
  emergency_contact text not null,
  health_notes text,
  language text not null default 'zh-HK'
    check (language in ('en', 'zh-HK')),
  -- Store only a hash of the device key; never the plaintext secret.
  device_key_hash text not null,
  consent_version text not null,
  consent_accepted_at timestamptz not null,
  is_disabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint elders_device_key_hash_unique unique (device_key_hash)
);

create index if not exists elders_is_disabled_idx
  on public.elders (is_disabled);

drop trigger if exists elders_set_updated_at on public.elders;
create trigger elders_set_updated_at
  before update on public.elders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users; volunteer | admin)
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('volunteer', 'admin')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx
  on public.profiles (role);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Current authenticated user's role from profiles (null if anon / missing).
-- Defined after public.profiles so SQL-language validation succeeds.
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- volunteers (1:1 extension of volunteer profiles)
-- ---------------------------------------------------------------------------

create table if not exists public.volunteers (
  id uuid primary key references public.profiles (id) on delete cascade,
  name text not null,
  phone text not null,
  age integer not null check (age > 0),
  service_areas text[] not null default '{}',
  bio text not null default '',
  approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists volunteers_approval_status_idx
  on public.volunteers (approval_status);

drop trigger if exists volunteers_set_updated_at on public.volunteers;
create trigger volunteers_set_updated_at
  before update on public.volunteers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- help_requests
-- ---------------------------------------------------------------------------

create table if not exists public.help_requests (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid not null references public.elders (id) on delete cascade,
  audio_path text not null,
  transcript text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'completed', 'cancelled')),
  latitude double precision,
  longitude double precision,
  volunteer_id uuid references public.volunteers (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  -- Points are awarded only after this timestamp is set.
  elder_confirmed_at timestamptz
);

create index if not exists help_requests_status_idx
  on public.help_requests (status);
create index if not exists help_requests_elder_id_idx
  on public.help_requests (elder_id);
create index if not exists help_requests_volunteer_id_idx
  on public.help_requests (volunteer_id);
create index if not exists help_requests_created_at_idx
  on public.help_requests (created_at desc);

-- ---------------------------------------------------------------------------
-- emergencies
-- ---------------------------------------------------------------------------

create table if not exists public.emergencies (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid not null references public.elders (id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'resolved', 'cancelled')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- Lookup token for the police share URL (not a password hash).
  police_share_token text not null,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  constraint emergencies_police_share_token_unique unique (police_share_token)
);

create index if not exists emergencies_status_idx
  on public.emergencies (status);
create index if not exists emergencies_elder_id_idx
  on public.emergencies (elder_id);

-- ---------------------------------------------------------------------------
-- locations (realtime trail; must attach to help_request XOR emergency)
-- ---------------------------------------------------------------------------

create table if not exists public.locations (
  id bigint generated always as identity primary key,
  elder_id uuid not null references public.elders (id) on delete cascade,
  help_request_id uuid references public.help_requests (id) on delete cascade,
  emergency_id uuid references public.emergencies (id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy_m double precision,
  recorded_at timestamptz not null default now(),
  constraint locations_parent_xor check (
    (help_request_id is not null and emergency_id is null)
    or (help_request_id is null and emergency_id is not null)
  )
);

create index if not exists locations_emergency_recorded_idx
  on public.locations (emergency_id, recorded_at desc);
create index if not exists locations_help_request_recorded_idx
  on public.locations (help_request_id, recorded_at desc);
create index if not exists locations_elder_recorded_idx
  on public.locations (elder_id, recorded_at desc);

-- ---------------------------------------------------------------------------
-- activity_logs (soft references; elders have no Auth user)
-- ---------------------------------------------------------------------------

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null
    check (actor_type in ('elder', 'volunteer', 'admin', 'system')),
  actor_id text,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_created_at_idx
  on public.activity_logs (created_at desc);
create index if not exists activity_logs_actor_idx
  on public.activity_logs (actor_type, actor_id);
create index if not exists activity_logs_action_idx
  on public.activity_logs (action);

-- ---------------------------------------------------------------------------
-- points (one row per confirmed help request)
-- ---------------------------------------------------------------------------

create table if not exists public.points (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references public.volunteers (id) on delete cascade,
  help_request_id uuid not null references public.help_requests (id) on delete cascade,
  points integer not null check (points > 0),
  created_at timestamptz not null default now(),
  constraint points_help_request_unique unique (help_request_id)
);

create index if not exists points_volunteer_created_idx
  on public.points (volunteer_id, created_at);

-- ---------------------------------------------------------------------------
-- certificates (monthly Top 3 PDF metadata)
-- ---------------------------------------------------------------------------

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references public.volunteers (id) on delete cascade,
  year_month text not null
    check (year_month ~ '^\d{4}-\d{2}$'),
  rank smallint not null check (rank between 1 and 3),
  generated_at timestamptz not null default now(),
  file_path text not null,
  constraint certificates_month_rank_unique unique (year_month, rank),
  constraint certificates_month_volunteer_unique unique (year_month, volunteer_id)
);

create index if not exists certificates_volunteer_id_idx
  on public.certificates (volunteer_id);

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('recordings', 'recordings', false),
  ('certificates', 'certificates', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Elder writes go through Next.js API routes using the service role
-- (bypasses RLS). Authenticated volunteer/admin policies cover the portals.
-- ---------------------------------------------------------------------------

alter table public.elders enable row level security;
alter table public.profiles enable row level security;
alter table public.volunteers enable row level security;
alter table public.help_requests enable row level security;
alter table public.emergencies enable row level security;
alter table public.locations enable row level security;
alter table public.activity_logs enable row level security;
alter table public.points enable row level security;
alter table public.certificates enable row level security;

-- profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.current_profile_role() = 'admin'
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
  on public.profiles for all
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- volunteers
drop policy if exists "volunteers_select_authenticated" on public.volunteers;
create policy "volunteers_select_authenticated"
  on public.volunteers for select
  to authenticated
  using (true);

drop policy if exists "volunteers_update_own" on public.volunteers;
create policy "volunteers_update_own"
  on public.volunteers for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "volunteers_admin_all" on public.volunteers;
create policy "volunteers_admin_all"
  on public.volunteers for all
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- elders: admins can read/manage; volunteers can read non-disabled for active work
drop policy if exists "elders_admin_all" on public.elders;
create policy "elders_admin_all"
  on public.elders for all
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

drop policy if exists "elders_volunteer_select" on public.elders;
create policy "elders_volunteer_select"
  on public.elders for select
  to authenticated
  using (
    public.current_profile_role() = 'volunteer'
    and is_disabled = false
  );

-- help_requests
drop policy if exists "help_requests_volunteer_select" on public.help_requests;
create policy "help_requests_volunteer_select"
  on public.help_requests for select
  to authenticated
  using (
    public.current_profile_role() in ('volunteer', 'admin')
  );

drop policy if exists "help_requests_volunteer_update_assigned" on public.help_requests;
create policy "help_requests_volunteer_update_assigned"
  on public.help_requests for update
  to authenticated
  using (
    public.current_profile_role() = 'admin'
    or (
      public.current_profile_role() = 'volunteer'
      and (
        volunteer_id is null
        or volunteer_id = auth.uid()
      )
    )
  )
  with check (
    public.current_profile_role() = 'admin'
    or (
      public.current_profile_role() = 'volunteer'
      and volunteer_id = auth.uid()
    )
  );

drop policy if exists "help_requests_admin_all" on public.help_requests;
create policy "help_requests_admin_all"
  on public.help_requests for all
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- emergencies
drop policy if exists "emergencies_admin_all" on public.emergencies;
create policy "emergencies_admin_all"
  on public.emergencies for all
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

drop policy if exists "emergencies_authenticated_select" on public.emergencies;
create policy "emergencies_authenticated_select"
  on public.emergencies for select
  to authenticated
  using (public.current_profile_role() in ('volunteer', 'admin'));

-- locations
drop policy if exists "locations_authenticated_select" on public.locations;
create policy "locations_authenticated_select"
  on public.locations for select
  to authenticated
  using (public.current_profile_role() in ('volunteer', 'admin'));

drop policy if exists "locations_admin_all" on public.locations;
create policy "locations_admin_all"
  on public.locations for all
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- activity_logs
drop policy if exists "activity_logs_admin_select" on public.activity_logs;
create policy "activity_logs_admin_select"
  on public.activity_logs for select
  using (public.current_profile_role() = 'admin');

drop policy if exists "activity_logs_authenticated_insert" on public.activity_logs;
create policy "activity_logs_authenticated_insert"
  on public.activity_logs for insert
  to authenticated
  with check (true);

-- points
drop policy if exists "points_select_own_or_admin" on public.points;
create policy "points_select_own_or_admin"
  on public.points for select
  using (
    volunteer_id = auth.uid()
    or public.current_profile_role() = 'admin'
  );

drop policy if exists "points_admin_all" on public.points;
create policy "points_admin_all"
  on public.points for all
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- certificates
drop policy if exists "certificates_select_own_or_admin" on public.certificates;
create policy "certificates_select_own_or_admin"
  on public.certificates for select
  using (
    volunteer_id = auth.uid()
    or public.current_profile_role() = 'admin'
  );

drop policy if exists "certificates_admin_all" on public.certificates;
create policy "certificates_admin_all"
  on public.certificates for all
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- Storage: authenticated read; writes via service role / signed upload in app layer
drop policy if exists "recordings_authenticated_read" on storage.objects;
create policy "recordings_authenticated_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'recordings');

drop policy if exists "certificates_own_or_admin_read" on storage.objects;
create policy "certificates_own_or_admin_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'certificates'
    and (
      public.current_profile_role() = 'admin'
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$ begin
  alter publication supabase_realtime add table public.help_requests;
exception when duplicate_object then null; when others then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.emergencies;
exception when duplicate_object then null; when others then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.locations;
exception when duplicate_object then null; when others then null;
end $$;

-- ---------------------------------------------------------------------------
-- Bootstrap notes (no seeded admin password — use Supabase Auth)
-- ---------------------------------------------------------------------------
-- 1. Create an Auth user in the Supabase Dashboard (Authentication → Users).
-- 2. Insert the admin profile:
--      insert into public.profiles (id, role, display_name)
--      values ('<auth-user-uuid>', 'admin', 'System Admin');
-- 3. Elder onboarding / device-key flows must use the service role key
--    on the server (Next.js route handlers), never from the browser.
