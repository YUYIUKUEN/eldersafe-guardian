-- ElderSafe Guardian shared schema
-- Run in Supabase SQL editor (or via supabase db push).

create extension if not exists "pgcrypto";

create table if not exists public.elders (
  device_key text primary key,
  name text not null,
  age integer not null check (age > 0),
  phone text not null,
  address text not null,
  emergency_contact text not null,
  health_notes text,
  disabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.volunteers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null unique,
  password_hash text not null,
  age integer not null check (age > 0),
  service_areas text[] not null default '{}',
  bio text not null default '',
  approved boolean not null default false,
  disabled boolean not null default false,
  points integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.help_requests (
  id uuid primary key default gen_random_uuid(),
  device_key text not null references public.elders(device_key) on delete cascade,
  elder_name text not null,
  elder_age integer not null,
  elder_address text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'completed')),
  volunteer_id uuid references public.volunteers(id) on delete set null,
  audio_path text,
  audio_url text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  elder_confirmed_at timestamptz,
  points_awarded_at timestamptz
);

create table if not exists public.emergencies (
  id uuid primary key default gen_random_uuid(),
  device_key text not null references public.elders(device_key) on delete cascade,
  police_share_token text not null unique,
  elder_name text not null,
  latitude double precision,
  longitude double precision,
  location_updated_at timestamptz,
  created_at timestamptz not null default now(),
  notified_admin boolean not null default true
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null
    check (actor_type in ('elder', 'volunteer', 'admin', 'system')),
  actor_id text,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists help_requests_status_idx on public.help_requests(status);
create index if not exists help_requests_device_key_idx on public.help_requests(device_key);
create index if not exists help_requests_volunteer_id_idx on public.help_requests(volunteer_id);
create index if not exists help_requests_points_month_idx
  on public.help_requests(points_awarded_at);
create index if not exists emergencies_token_idx on public.emergencies(police_share_token);
create index if not exists activity_logs_created_idx on public.activity_logs(created_at desc);

-- Storage bucket for help-request recordings
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', true)
on conflict (id) do nothing;

-- Dev-friendly policies (tighten before production)
alter table public.elders enable row level security;
alter table public.volunteers enable row level security;
alter table public.admins enable row level security;
alter table public.help_requests enable row level security;
alter table public.emergencies enable row level security;
alter table public.activity_logs enable row level security;

do $$ begin
  create policy "public read elders" on public.elders for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public write elders" on public.elders for all using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public read volunteers" on public.volunteers for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public write volunteers" on public.volunteers for all using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public read admins" on public.admins for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public write admins" on public.admins for all using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public read help_requests" on public.help_requests for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public write help_requests" on public.help_requests for all using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public read emergencies" on public.emergencies for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public write emergencies" on public.emergencies for all using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public read logs" on public.activity_logs for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public write logs" on public.activity_logs for all using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public read recordings" on storage.objects
    for select using (bucket_id = 'recordings');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public write recordings" on storage.objects
    for insert with check (bucket_id = 'recordings');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public update recordings" on storage.objects
    for update using (bucket_id = 'recordings');
exception when duplicate_object then null; end $$;

-- Seed default admin (password: admin123, sha256)
insert into public.admins (name, email, password_hash)
values (
  'System Admin',
  'admin@eldersafe.local',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
)
on conflict (email) do nothing;

-- Realtime publication (ignore if already added)
do $$ begin
  alter publication supabase_realtime add table public.help_requests;
exception when duplicate_object then null; when others then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.emergencies;
exception when duplicate_object then null; when others then null;
end $$;
