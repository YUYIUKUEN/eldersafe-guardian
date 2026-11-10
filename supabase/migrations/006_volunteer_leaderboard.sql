-- Volunteer leaderboard: anonymity flag, ranked RPC, points visibility for
-- approved volunteers (Realtime refresh), and points realtime publication.

-- ---------------------------------------------------------------------------
-- volunteers.leaderboard_anonymous
-- ---------------------------------------------------------------------------

alter table public.volunteers
  add column if not exists leaderboard_anonymous boolean not null default false;

comment on column public.volunteers.leaderboard_anonymous is
  'When true, leaderboard shows surname only instead of full name.';

-- ---------------------------------------------------------------------------
-- Ranked leaderboard for approved volunteers / admins
-- p_period: 'month' (current Asia/Hong_Kong calendar month) or 'all'
-- Returns full name + anonymity flag; the app formats surname when needed.
-- ---------------------------------------------------------------------------

create or replace function public.get_volunteer_leaderboard(
  p_period text default 'month'
)
returns table (
  volunteer_id uuid,
  full_name text,
  is_anonymous boolean,
  points integer,
  completed_count integer,
  rank bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_year_month text;
begin
  if p_period is null or p_period not in ('month', 'all') then
    raise exception 'INVALID_PERIOD';
  end if;

  if not (
    public.is_approved_volunteer()
    or public.current_profile_role() = 'admin'
  ) then
    raise exception 'FORBIDDEN';
  end if;

  v_year_month := to_char(timezone('Asia/Hong_Kong', now()), 'YYYY-MM');

  return query
  with scored as (
    select
      v.id as volunteer_id,
      v.name as full_name,
      v.leaderboard_anonymous as is_anonymous,
      coalesce(sum(p.points), 0)::integer as points,
      count(p.id)::integer as completed_count
    from public.volunteers v
    left join public.points p
      on p.volunteer_id = v.id
     and (
       p_period = 'all'
       or to_char(timezone('Asia/Hong_Kong', p.created_at), 'YYYY-MM') = v_year_month
     )
    where v.approval_status = 'approved'
    group by v.id, v.name, v.leaderboard_anonymous
  )
  select
    s.volunteer_id,
    s.full_name,
    s.is_anonymous,
    s.points,
    s.completed_count,
    rank() over (
      order by s.points desc, s.completed_count desc, s.full_name asc, s.volunteer_id asc
    ) as rank
  from scored s
  order by rank, s.volunteer_id;
end;
$$;

comment on function public.get_volunteer_leaderboard(text) is
  'Ranked volunteer leaderboard for the current HK month or all time.';

revoke all on function public.get_volunteer_leaderboard(text) from public;
grant execute on function public.get_volunteer_leaderboard(text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Allow approved volunteers to read points rows (leaderboard Realtime + RPC
-- already aggregates; this unlocks postgres_changes for peer inserts).
-- ---------------------------------------------------------------------------

drop policy if exists "points_select_own_or_admin" on public.points;
drop policy if exists "points_select_own_admin_or_approved" on public.points;
create policy "points_select_own_admin_or_approved"
  on public.points for select
  to authenticated
  using (
    volunteer_id = auth.uid()
    or public.current_profile_role() = 'admin'
    or public.is_approved_volunteer()
  );

-- ---------------------------------------------------------------------------
-- Realtime: points inserts refresh volunteer leaderboards
-- ---------------------------------------------------------------------------

do $$ begin
  alter publication supabase_realtime add table public.points;
exception when duplicate_object then null; when others then null;
end $$;
