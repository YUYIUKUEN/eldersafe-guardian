-- Volunteer marks service complete (awaiting elder confirm); admin overdue helpers;
-- feed includes elder_confirmed_at; release only before volunteer completion.

-- ---------------------------------------------------------------------------
-- complete_help_request: set completed_at, keep status=accepted until elder confirms
-- ---------------------------------------------------------------------------

create or replace function public.complete_help_request(target_id uuid)
returns table (
  id uuid,
  status text,
  volunteer_id uuid,
  accepted_at timestamptz,
  completed_at timestamptz,
  elder_confirmed_at timestamptz,
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
  set completed_at = now()
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
    hr.elder_id;
end;
$$;

revoke all on function public.complete_help_request(uuid) from public;
grant execute on function public.complete_help_request(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- release only while still actively serving (not yet marked complete)
-- ---------------------------------------------------------------------------

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
    and hr.completed_at is null
  returning
    hr.id,
    hr.status,
    hr.volunteer_id,
    hr.accepted_at,
    hr.elder_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Refresh feed RPCs to expose elder_confirmed_at
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
    and hr.status <> 'cancelled'
    and (
      hr.status = 'pending'
      or hr.volunteer_id = auth.uid()
    )
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

revoke all on function public.get_volunteer_help_request(uuid) from public;
grant execute on function public.get_volunteer_help_request(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: list overdue elder confirmations (>24h) and force-confirm helper
-- (admin UI comes later; reserved for manual handling)
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_overdue_elder_confirmations()
returns table (
  id uuid,
  elder_id uuid,
  volunteer_id uuid,
  completed_at timestamptz,
  hours_waiting numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    hr.id,
    hr.elder_id,
    hr.volunteer_id,
    hr.completed_at,
    round(extract(epoch from (now() - hr.completed_at)) / 3600.0, 1) as hours_waiting
  from public.help_requests hr
  where public.current_profile_role() = 'admin'
    and hr.status = 'accepted'
    and hr.completed_at is not null
    and hr.elder_confirmed_at is null
    and hr.completed_at < now() - interval '24 hours'
  order by hr.completed_at asc;
$$;

create or replace function public.admin_force_confirm_help_request(target_id uuid)
returns table (
  id uuid,
  status text,
  elder_confirmed_at timestamptz,
  volunteer_id uuid,
  elder_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_profile_role() is distinct from 'admin' then
    raise exception 'admin_only' using errcode = '42501';
  end if;

  return query
  update public.help_requests hr
  set
    status = 'completed',
    elder_confirmed_at = coalesce(hr.elder_confirmed_at, now())
  where hr.id = target_id
    and hr.status = 'accepted'
    and hr.completed_at is not null
    and hr.elder_confirmed_at is null
  returning
    hr.id,
    hr.status,
    hr.elder_confirmed_at,
    hr.volunteer_id,
    hr.elder_id;
end;
$$;

revoke all on function public.admin_list_overdue_elder_confirmations() from public;
revoke all on function public.admin_force_confirm_help_request(uuid) from public;
grant execute on function public.admin_list_overdue_elder_confirmations() to authenticated;
grant execute on function public.admin_force_confirm_help_request(uuid) to authenticated;

comment on function public.admin_list_overdue_elder_confirmations() is
  'Admin helper: help requests waiting >24h for elder confirm. UI in admin app later.';
comment on function public.admin_force_confirm_help_request(uuid) is
  'Admin helper: manually complete after overdue elder confirm. Points still via phase-5 award hook.';
