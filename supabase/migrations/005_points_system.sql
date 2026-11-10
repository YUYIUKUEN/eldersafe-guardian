-- Points system: elder rating column, atomic confirm+award RPC,
-- and volunteer total / monthly point views + helper functions.

-- ---------------------------------------------------------------------------
-- help_requests.elder_rating (optional 1–5 after elder confirms)
-- ---------------------------------------------------------------------------

alter table public.help_requests
  add column if not exists elder_rating smallint;

alter table public.help_requests
  drop constraint if exists help_requests_elder_rating_check;

alter table public.help_requests
  add constraint help_requests_elder_rating_check
  check (elder_rating is null or elder_rating between 1 and 5);

comment on column public.help_requests.elder_rating is
  'Optional 1–5 star rating from the elder at confirm time; null if skipped.';

-- ---------------------------------------------------------------------------
-- Atomic confirm + points insert + activity log (one transaction)
-- Scoring amounts are computed in app code from packages/shared points rules
-- and passed in as p_points / p_breakdown.
-- ---------------------------------------------------------------------------

create or replace function public.confirm_help_request_award_points(
  p_help_request_id uuid,
  p_elder_id uuid,
  p_points integer,
  p_rating smallint default null,
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
begin
  if p_points is null or p_points <= 0 then
    raise exception 'INVALID_POINTS';
  end if;

  if p_rating is not null and (p_rating < 1 or p_rating > 5) then
    raise exception 'INVALID_RATING';
  end if;

  select *
  into v_row
  from public.help_requests
  where id = p_help_request_id
    and elder_id = p_elder_id
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

  -- Idempotent guard: unique(help_request_id) on points also blocks duplicates.
  if exists (
    select 1 from public.points where help_request_id = p_help_request_id
  ) then
    raise exception 'HELP_REQUEST_NOT_CONFIRMABLE';
  end if;

  update public.help_requests
  set
    status = 'completed',
    elder_confirmed_at = v_now,
    elder_rating = p_rating
  where id = p_help_request_id;

  insert into public.points (volunteer_id, help_request_id, points)
  values (v_row.volunteer_id, p_help_request_id, p_points)
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
    'elder',
    p_elder_id::text,
    'elder.help_request.confirm',
    'help_request',
    p_help_request_id::text,
    jsonb_build_object(
      'volunteerId', v_row.volunteer_id,
      'points', p_points,
      'pointsId', v_points_id,
      'rating', p_rating,
      'breakdown', p_breakdown,
      'storeMode', 'supabase'
    )
  );

  return jsonb_build_object(
    'helpRequestId', p_help_request_id,
    'volunteerId', v_row.volunteer_id,
    'pointsId', v_points_id,
    'points', p_points,
    'rating', p_rating,
    'elderConfirmedAt', v_now,
    'status', 'completed',
    'breakdown', p_breakdown
  );
end;
$$;

comment on function public.confirm_help_request_award_points is
  'Marks a help request completed, awards volunteer points once, and writes activity_logs in one transaction.';

revoke all on function public.confirm_help_request_award_points(
  uuid, uuid, integer, smallint, jsonb
) from public;

grant execute on function public.confirm_help_request_award_points(
  uuid, uuid, integer, smallint, jsonb
) to service_role;

-- ---------------------------------------------------------------------------
-- Views: total and monthly points per volunteer
-- security_invoker so underlying points RLS still applies for authenticated.
-- ---------------------------------------------------------------------------

create or replace view public.volunteer_points_totals
with (security_invoker = true)
as
select
  v.id as volunteer_id,
  coalesce(sum(p.points), 0)::integer as total_points,
  count(p.id)::integer as entry_count
from public.volunteers v
left join public.points p on p.volunteer_id = v.id
group by v.id;

comment on view public.volunteer_points_totals is
  'Lifetime points total per volunteer (sum of points rows).';

create or replace view public.volunteer_points_monthly
with (security_invoker = true)
as
select
  p.volunteer_id,
  to_char(timezone('Asia/Hong_Kong', p.created_at), 'YYYY-MM') as year_month,
  sum(p.points)::integer as month_points,
  count(p.id)::integer as entry_count
from public.points p
group by
  p.volunteer_id,
  to_char(timezone('Asia/Hong_Kong', p.created_at), 'YYYY-MM');

comment on view public.volunteer_points_monthly is
  'Points per volunteer per calendar month (Asia/Hong_Kong).';

grant select on public.volunteer_points_totals to authenticated;
grant select on public.volunteer_points_monthly to authenticated;

-- ---------------------------------------------------------------------------
-- Helper functions for a single volunteer
-- ---------------------------------------------------------------------------

create or replace function public.volunteer_total_points(p_volunteer_id uuid)
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(points), 0)::integer
  from public.points
  where volunteer_id = p_volunteer_id;
$$;

create or replace function public.volunteer_month_points(
  p_volunteer_id uuid,
  p_year_month text default null
)
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(points), 0)::integer
  from public.points
  where volunteer_id = p_volunteer_id
    and to_char(timezone('Asia/Hong_Kong', created_at), 'YYYY-MM')
      = coalesce(
        p_year_month,
        to_char(timezone('Asia/Hong_Kong', now()), 'YYYY-MM')
      );
$$;

comment on function public.volunteer_total_points(uuid) is
  'Returns lifetime points for one volunteer.';
comment on function public.volunteer_month_points(uuid, text) is
  'Returns points for one volunteer in YYYY-MM (defaults to current HK month).';

grant execute on function public.volunteer_total_points(uuid) to authenticated, service_role;
grant execute on function public.volunteer_month_points(uuid, text) to authenticated, service_role;
