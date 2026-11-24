-- Phase 2: meeting place (home / custom) instead of live GPS for help requests;
-- volunteer completion proof (photo path + notes).

-- ---------------------------------------------------------------------------
-- Schema: elders.meeting_place (optional preferred meeting spot)
-- ---------------------------------------------------------------------------

alter table public.elders
  add column if not exists meeting_place text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'elders_meeting_place_length_check'
  ) then
    alter table public.elders
      add constraint elders_meeting_place_length_check
      check (meeting_place is null or char_length(meeting_place) <= 300);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Schema: help_requests meeting + completion proof columns
-- ---------------------------------------------------------------------------

alter table public.help_requests
  add column if not exists meeting_type text,
  add column if not exists meeting_place text,
  add column if not exists completion_photo_path text,
  add column if not exists completion_notes text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'help_requests_meeting_type_check'
  ) then
    alter table public.help_requests
      add constraint help_requests_meeting_type_check
      check (meeting_type is null or meeting_type in ('home', 'custom'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'help_requests_meeting_place_length_check'
  ) then
    alter table public.help_requests
      add constraint help_requests_meeting_place_length_check
      check (meeting_place is null or char_length(meeting_place) <= 300);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'help_requests_completion_notes_length_check'
  ) then
    alter table public.help_requests
      add constraint help_requests_completion_notes_length_check
      check (
        completion_notes is null
        or (
          char_length(completion_notes) >= 2
          and char_length(completion_notes) <= 500
        )
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for completion proof photos
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('completion-proofs', 'completion-proofs', false)
on conflict (id) do update set public = false;

-- No authenticated SELECT on objects — signed URLs via service role only
-- (same pattern as migration 012 for voice-recordings).

-- ---------------------------------------------------------------------------
-- complete_help_request: require notes + photo path
-- ---------------------------------------------------------------------------

drop function if exists public.complete_help_request(uuid);

create or replace function public.complete_help_request(
  target_id uuid,
  p_notes text,
  p_photo_path text
)
returns table (
  id uuid,
  status text,
  volunteer_id uuid,
  accepted_at timestamptz,
  completed_at timestamptz,
  elder_confirmed_at timestamptz,
  elder_id uuid,
  completion_photo_path text,
  completion_notes text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  trimmed_notes text := nullif(btrim(p_notes), '');
  trimmed_photo text := nullif(btrim(p_photo_path), '');
begin
  if not public.is_approved_volunteer() then
    raise exception 'not_approved_volunteer' using errcode = '42501';
  end if;

  if trimmed_notes is null or char_length(trimmed_notes) < 2 then
    raise exception 'completion_notes_required' using errcode = '22023';
  end if;

  if char_length(trimmed_notes) > 500 then
    raise exception 'completion_notes_too_long' using errcode = '22023';
  end if;

  if trimmed_photo is null or char_length(trimmed_photo) < 3 then
    raise exception 'completion_photo_required' using errcode = '22023';
  end if;

  if char_length(trimmed_photo) > 500 then
    raise exception 'completion_photo_too_long' using errcode = '22023';
  end if;

  return query
  update public.help_requests hr
  set
    completed_at = now(),
    completion_notes = trimmed_notes,
    completion_photo_path = trimmed_photo
  where hr.id = target_id
    and hr.status = 'accepted'
    and hr.volunteer_id = auth.uid()
    and hr.completed_at is null
  returning
    hr.id,
    hr.status,
    hr.volunteer_id,
    hr.accepted_at,
    hr.completed_at,
    hr.elder_confirmed_at,
    hr.elder_id,
    hr.completion_photo_path,
    hr.completion_notes;
end;
$$;

revoke all on function public.complete_help_request(uuid, text, text) from public;
grant execute on function public.complete_help_request(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Feed RPCs: meeting place + completion proof fields
-- ---------------------------------------------------------------------------

drop function if exists public.list_volunteer_help_feed();

create function public.list_volunteer_help_feed()
returns table (
  id uuid,
  status text,
  created_at timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz,
  elder_confirmed_at timestamptz,
  audio_path text,
  transcript text,
  request_latitude double precision,
  request_longitude double precision,
  meeting_type text,
  meeting_place text,
  completion_photo_path text,
  completion_notes text,
  volunteer_id uuid,
  elder_id uuid,
  elder_name text,
  elder_age integer,
  elder_address text,
  elder_phone text,
  live_latitude double precision,
  live_longitude double precision,
  live_recorded_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    hr.id,
    hr.status,
    hr.created_at,
    hr.accepted_at,
    hr.completed_at,
    hr.elder_confirmed_at,
    hr.audio_path,
    hr.transcript,
    hr.latitude as request_latitude,
    hr.longitude as request_longitude,
    hr.meeting_type,
    hr.meeting_place,
    case
      when hr.volunteer_id = auth.uid() then hr.completion_photo_path
      else null
    end as completion_photo_path,
    case
      when hr.volunteer_id = auth.uid() then hr.completion_notes
      else null
    end as completion_notes,
    hr.volunteer_id,
    e.id as elder_id,
    e.name as elder_name,
    e.age as elder_age,
    case
      when hr.volunteer_id = auth.uid() then e.address
      else null
    end as elder_address,
    case
      when hr.status = 'pending' or hr.volunteer_id = auth.uid() then e.phone
      else null
    end as elder_phone,
    coalesce(loc.latitude, hr.latitude) as live_latitude,
    coalesce(loc.longitude, hr.longitude) as live_longitude,
    loc.recorded_at as live_recorded_at
  from public.help_requests hr
  inner join public.elders e on e.id = hr.elder_id
  left join lateral (
    select l.latitude, l.longitude, l.recorded_at
    from public.locations l
    where l.help_request_id = hr.id
    order by l.recorded_at desc
    limit 1
  ) loc on true
  where public.is_approved_volunteer()
    and e.is_disabled = false
    and hr.status <> 'cancelled'
    and (
      hr.status = 'pending'
      or hr.volunteer_id = auth.uid()
    )
  -- Newest first so the app can cap to the latest N rows, then reverse for UI.
  order by hr.created_at desc;
$$;

revoke all on function public.list_volunteer_help_feed() from public;
grant execute on function public.list_volunteer_help_feed() to authenticated;

drop function if exists public.get_volunteer_help_request(uuid);

create function public.get_volunteer_help_request(target_id uuid)
returns table (
  id uuid,
  status text,
  created_at timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz,
  elder_confirmed_at timestamptz,
  audio_path text,
  transcript text,
  request_latitude double precision,
  request_longitude double precision,
  meeting_type text,
  meeting_place text,
  completion_photo_path text,
  completion_notes text,
  volunteer_id uuid,
  elder_id uuid,
  elder_name text,
  elder_age integer,
  elder_address text,
  elder_phone text,
  live_latitude double precision,
  live_longitude double precision,
  live_recorded_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    hr.id,
    hr.status,
    hr.created_at,
    hr.accepted_at,
    hr.completed_at,
    hr.elder_confirmed_at,
    hr.audio_path,
    hr.transcript,
    hr.latitude as request_latitude,
    hr.longitude as request_longitude,
    hr.meeting_type,
    hr.meeting_place,
    case
      when hr.volunteer_id = auth.uid() then hr.completion_photo_path
      else null
    end as completion_photo_path,
    case
      when hr.volunteer_id = auth.uid() then hr.completion_notes
      else null
    end as completion_notes,
    hr.volunteer_id,
    e.id as elder_id,
    e.name as elder_name,
    e.age as elder_age,
    case
      when hr.volunteer_id = auth.uid() then e.address
      else null
    end as elder_address,
    case
      when hr.status = 'pending' or hr.volunteer_id = auth.uid() then e.phone
      else null
    end as elder_phone,
    coalesce(loc.latitude, hr.latitude) as live_latitude,
    coalesce(loc.longitude, hr.longitude) as live_longitude,
    loc.recorded_at as live_recorded_at
  from public.help_requests hr
  inner join public.elders e on e.id = hr.elder_id
  left join lateral (
    select l.latitude, l.longitude, l.recorded_at
    from public.locations l
    where l.help_request_id = hr.id
    order by l.recorded_at desc
    limit 1
  ) loc on true
  where public.is_approved_volunteer()
    and e.is_disabled = false
    and hr.id = target_id
    and hr.status <> 'cancelled'
    and (
      hr.status = 'pending'
      or hr.volunteer_id = auth.uid()
    )
  limit 1;
$$;

revoke all on function public.get_volunteer_help_request(uuid) from public;
grant execute on function public.get_volunteer_help_request(uuid) to authenticated;
