-- Volunteer help feed: mask elder PII until accept; restrict list visibility;
-- expose a security-definer RPC for the volunteer home cards.

-- ---------------------------------------------------------------------------
-- Help requests: volunteers see pending + own only
-- ---------------------------------------------------------------------------

drop policy if exists "help_requests_volunteer_select" on public.help_requests;
create policy "help_requests_volunteer_select"
  on public.help_requests for select
  to authenticated
  using (
    public.current_profile_role() = 'admin'
    or (
      public.is_approved_volunteer()
      and (
        status = 'pending'
        or volunteer_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Elders: remove broad volunteer SELECT (sensitive columns).
-- Volunteers read elder fields only via list_volunteer_help_feed().
-- ---------------------------------------------------------------------------

drop policy if exists "elders_volunteer_select" on public.elders;

-- ---------------------------------------------------------------------------
-- Locations: only for help requests the volunteer may already see
-- ---------------------------------------------------------------------------

drop policy if exists "locations_authenticated_select" on public.locations;
create policy "locations_authenticated_select"
  on public.locations for select
  to authenticated
  using (
    public.current_profile_role() = 'admin'
    or (
      public.is_approved_volunteer()
      and help_request_id is not null
      and exists (
        select 1
        from public.help_requests hr
        where hr.id = locations.help_request_id
          and (
            hr.status = 'pending'
            or hr.volunteer_id = auth.uid()
          )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: only approved volunteers (and admins via role) may read recordings
-- ---------------------------------------------------------------------------

drop policy if exists "voice_recordings_authenticated_read" on storage.objects;
drop policy if exists "voice_recordings_approved_volunteer_read" on storage.objects;
create policy "voice_recordings_approved_volunteer_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'voice-recordings'
    and (
      public.current_profile_role() = 'admin'
      or public.is_approved_volunteer()
    )
  );

-- ---------------------------------------------------------------------------
-- Feed RPC: never returns emergency_contact / health_notes / device_key_hash.
-- address + phone only when this volunteer has accepted the request.
-- ---------------------------------------------------------------------------

drop function if exists public.list_volunteer_help_feed();

create function public.list_volunteer_help_feed()
returns table (
  id uuid,
  status text,
  created_at timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz,
  audio_path text,
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

-- ---------------------------------------------------------------------------
-- Audio path check helper for signed URL API
-- ---------------------------------------------------------------------------

create or replace function public.volunteer_can_access_help_request(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.help_requests hr
    where hr.id = target_id
      and public.is_approved_volunteer()
      and (
        hr.status = 'pending'
        or hr.volunteer_id = auth.uid()
      )
  );
$$;

revoke all on function public.volunteer_can_access_help_request(uuid) from public;
grant execute on function public.volunteer_can_access_help_request(uuid) to authenticated;
