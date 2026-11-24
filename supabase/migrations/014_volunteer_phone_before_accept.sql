-- Allow approved volunteers to see elder phone before accepting a pending
-- request, so they can call to clarify content first. Address stays masked
-- until the volunteer has accepted (assigned) the case.

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
