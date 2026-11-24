-- H1: police track token expiry
-- M2: block disabled elders from volunteer help access
-- M1: admin force-confirm awards points in the same transaction

-- ---------------------------------------------------------------------------
-- Emergencies: police_share_expires_at
-- Active links last 24h from start; resolve shortens to ended_at + 2h (min).
-- ---------------------------------------------------------------------------

alter table public.emergencies
  add column if not exists police_share_expires_at timestamptz;

update public.emergencies
set police_share_expires_at = case
  when status = 'cancelled' then coalesce(ended_at, started_at)
  when status = 'resolved' then least(
    started_at + interval '24 hours',
    coalesce(ended_at, started_at) + interval '2 hours'
  )
  else started_at + interval '24 hours'
end
where police_share_expires_at is null;

alter table public.emergencies
  alter column police_share_expires_at set not null;

create index if not exists emergencies_police_share_expires_at_idx
  on public.emergencies (police_share_expires_at);

comment on column public.emergencies.police_share_expires_at is
  'Public /track/{token} stops working after this instant (active TTL 24h; resolved grace 2h).';

-- ---------------------------------------------------------------------------
-- M2: help_requests volunteer select — require elder not disabled
-- ---------------------------------------------------------------------------

drop policy if exists "help_requests_volunteer_select" on public.help_requests;
create policy "help_requests_volunteer_select"
  on public.help_requests for select
  to authenticated
  using (
    public.current_profile_role() = 'admin'
    or (
      public.is_approved_volunteer()
      and exists (
        select 1
        from public.elders e
        where e.id = help_requests.elder_id
          and e.is_disabled = false
      )
      and (
        status = 'pending'
        or volunteer_id = auth.uid()
      )
    )
  );

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
    join public.elders e on e.id = hr.elder_id
    where hr.id = target_id
      and public.is_approved_volunteer()
      and e.is_disabled = false
      and (
        hr.status = 'pending'
        or hr.volunteer_id = auth.uid()
      )
  );
$$;

revoke all on function public.volunteer_can_access_help_request(uuid) from public;
grant execute on function public.volunteer_can_access_help_request(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- M1: overdue list (richer) + force confirm with points
-- ---------------------------------------------------------------------------

drop function if exists public.admin_list_overdue_elder_confirmations();

create or replace function public.admin_list_overdue_elder_confirmations()
returns table (
  id uuid,
  elder_id uuid,
  volunteer_id uuid,
  elder_name text,
  volunteer_name text,
  accepted_at timestamptz,
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
    e.name as elder_name,
    v.name as volunteer_name,
    hr.accepted_at,
    hr.completed_at,
    round(extract(epoch from (now() - hr.completed_at)) / 3600.0, 1) as hours_waiting
  from public.help_requests hr
  join public.elders e on e.id = hr.elder_id
  left join public.volunteers v on v.id = hr.volunteer_id
  where public.current_profile_role() = 'admin'
    and hr.status = 'accepted'
    and hr.completed_at is not null
    and hr.elder_confirmed_at is null
    and hr.completed_at < now() - interval '24 hours'
  order by hr.completed_at asc;
$$;

drop function if exists public.admin_force_confirm_help_request(uuid);

create or replace function public.admin_force_confirm_help_request(
  target_id uuid,
  p_points integer,
  p_breakdown jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.help_requests%rowtype;
  v_points_id uuid;
  v_now timestamptz := now();
  v_admin_id uuid := auth.uid();
begin
  if public.current_profile_role() is distinct from 'admin' then
    raise exception 'ADMIN_ONLY' using errcode = '42501';
  end if;

  if p_points is null or p_points <= 0 then
    raise exception 'INVALID_POINTS';
  end if;

  select *
  into v_row
  from public.help_requests
  where id = target_id
  for update;

  if not found then
    raise exception 'HELP_REQUEST_NOT_FOUND';
  end if;

  if v_row.status <> 'accepted'
     or v_row.completed_at is null
     or v_row.elder_confirmed_at is not null
     or v_row.volunteer_id is null then
    raise exception 'HELP_REQUEST_NOT_CONFIRMABLE';
  end if;

  if v_row.completed_at >= v_now - interval '24 hours' then
    raise exception 'HELP_REQUEST_NOT_OVERDUE';
  end if;

  if exists (
    select 1 from public.points where help_request_id = target_id
  ) then
    raise exception 'HELP_REQUEST_NOT_CONFIRMABLE';
  end if;

  update public.help_requests
  set
    status = 'completed',
    elder_confirmed_at = v_now
  where id = target_id;

  insert into public.points (volunteer_id, help_request_id, points)
  values (v_row.volunteer_id, target_id, p_points)
  returning id into v_points_id;

  insert into public.activity_logs (
    actor_type,
    actor_id,
    action,
    target_type,
    target_id,
    metadata
  )
  values (
    'admin',
    coalesce(v_admin_id::text, 'admin'),
    'admin.help.force_confirm',
    'help_request',
    target_id::text,
    jsonb_build_object(
      'volunteerId', v_row.volunteer_id,
      'elderId', v_row.elder_id,
      'points', p_points,
      'pointsId', v_points_id,
      'breakdown', p_breakdown,
      'completedAt', v_row.completed_at,
      'force', true
    )
  );

  return jsonb_build_object(
    'helpRequestId', target_id,
    'volunteerId', v_row.volunteer_id,
    'elderId', v_row.elder_id,
    'pointsId', v_points_id,
    'points', p_points,
    'elderConfirmedAt', v_now,
    'status', 'completed',
    'breakdown', p_breakdown
  );
end;
$$;

revoke all on function public.admin_list_overdue_elder_confirmations() from public;
revoke all on function public.admin_force_confirm_help_request(uuid, integer, jsonb) from public;
grant execute on function public.admin_list_overdue_elder_confirmations() to authenticated;
grant execute on function public.admin_force_confirm_help_request(uuid, integer, jsonb) to authenticated;

comment on function public.admin_list_overdue_elder_confirmations() is
  'Admin: help requests waiting >24h for elder confirm.';
comment on function public.admin_force_confirm_help_request(uuid, integer, jsonb) is
  'Admin: force-complete overdue help request and award volunteer points once.';
