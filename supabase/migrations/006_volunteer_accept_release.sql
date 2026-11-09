-- Atomic accept / release for help requests (race-safe conditional updates).

create or replace function public.accept_help_request(target_id uuid)
returns table (
  id uuid,
  status text,
  volunteer_id uuid,
  accepted_at timestamptz,
  elder_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_approved_volunteer() then
    raise exception 'not_approved_volunteer' using errcode = '42501';
  end if;

  return query
  update public.help_requests hr
  set
    status = 'accepted',
    volunteer_id = auth.uid(),
    accepted_at = now()
  where hr.id = target_id
    and hr.status = 'pending'
    and hr.volunteer_id is null
  returning
    hr.id,
    hr.status,
    hr.volunteer_id,
    hr.accepted_at,
    hr.elder_id;
end;
$$;

create or replace function public.release_help_request(
  target_id uuid,
  reason text
)
returns table (
  id uuid,
  status text,
  volunteer_id uuid,
  accepted_at timestamptz,
  elder_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  trimmed text := nullif(btrim(reason), '');
begin
  if not public.is_approved_volunteer() then
    raise exception 'not_approved_volunteer' using errcode = '42501';
  end if;

  if trimmed is null or char_length(trimmed) < 2 then
    raise exception 'release_reason_required' using errcode = '22023';
  end if;

  if char_length(trimmed) > 500 then
    raise exception 'release_reason_too_long' using errcode = '22023';
  end if;

  return query
  update public.help_requests hr
  set
    status = 'pending',
    volunteer_id = null,
    accepted_at = null
  where hr.id = target_id
    and hr.status = 'accepted'
    and hr.volunteer_id = auth.uid()
  returning
    hr.id,
    hr.status,
    hr.volunteer_id,
    hr.accepted_at,
    hr.elder_id;
end;
$$;

-- Single-request detail for the assigned / pending-visible volunteer feed shape.
drop function if exists public.get_volunteer_help_request(uuid);

create function public.get_volunteer_help_request(target_id uuid)
returns table (
  id uuid,
  status text,
  created_at timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz,
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
      when hr.volunteer_id = auth.uid() then e.phone
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

revoke all on function public.accept_help_request(uuid) from public;
revoke all on function public.release_help_request(uuid, text) from public;
revoke all on function public.get_volunteer_help_request(uuid) from public;
grant execute on function public.accept_help_request(uuid) to authenticated;
grant execute on function public.release_help_request(uuid, text) to authenticated;
grant execute on function public.get_volunteer_help_request(uuid) to authenticated;
