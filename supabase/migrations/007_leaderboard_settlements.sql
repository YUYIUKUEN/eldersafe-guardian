-- Monthly leaderboard settlement lock + certificate helpers.

-- ---------------------------------------------------------------------------
-- leaderboard_settlements: one row per settled year_month (immutable lock)
-- ---------------------------------------------------------------------------

create table if not exists public.leaderboard_settlements (
  year_month text primary key
    check (year_month ~ '^\d{4}-\d{2}$'),
  settled_at timestamptz not null default now(),
  settled_by uuid not null references public.profiles (id),
  -- [{ "volunteerId": "...", "rank": 1, "points": 20, "completedCount": 2, "name": "..." }, ...]
  podium jsonb not null,
  created_at timestamptz not null default now(),
  constraint leaderboard_settlements_podium_is_array check (jsonb_typeof(podium) = 'array')
);

comment on table public.leaderboard_settlements is
  'Locked monthly Top 3 settlements; presence of a row means the month cannot be settled again.';

alter table public.leaderboard_settlements enable row level security;

drop policy if exists "leaderboard_settlements_admin_all" on public.leaderboard_settlements;
create policy "leaderboard_settlements_admin_all"
  on public.leaderboard_settlements for all
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

drop policy if exists "leaderboard_settlements_volunteer_select" on public.leaderboard_settlements;
create policy "leaderboard_settlements_volunteer_select"
  on public.leaderboard_settlements for select
  to authenticated
  using (
    public.current_profile_role() = 'admin'
    or public.is_approved_volunteer()
  );

-- ---------------------------------------------------------------------------
-- Monthly ranking RPC for admins (top N by points, then completed services)
-- ---------------------------------------------------------------------------

create or replace function public.get_monthly_leaderboard(
  p_year_month text,
  p_limit integer default 10
)
returns table (
  volunteer_id uuid,
  full_name text,
  points integer,
  completed_count integer,
  rank bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_year_month is null or p_year_month !~ '^\d{4}-\d{2}$' then
    raise exception 'INVALID_YEAR_MONTH';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'INVALID_LIMIT';
  end if;

  if public.current_profile_role() is distinct from 'admin'
     and not public.is_approved_volunteer() then
    raise exception 'FORBIDDEN';
  end if;

  return query
  with scored as (
    select
      v.id as volunteer_id,
      v.name as full_name,
      coalesce(sum(p.points), 0)::integer as points,
      count(p.id)::integer as completed_count
    from public.volunteers v
    left join public.points p
      on p.volunteer_id = v.id
     and to_char(timezone('Asia/Hong_Kong', p.created_at), 'YYYY-MM') = p_year_month
    where v.approval_status = 'approved'
    group by v.id, v.name
    having count(p.id) > 0
  )
  select
    s.volunteer_id,
    s.full_name,
    s.points,
    s.completed_count,
    rank() over (
      order by s.points desc, s.completed_count desc, s.full_name asc, s.volunteer_id asc
    ) as rank
  from scored s
  order by rank, s.volunteer_id
  limit p_limit;
end;
$$;

comment on function public.get_monthly_leaderboard(text, integer) is
  'Top N volunteers for a Hong Kong calendar month (points, then completed services).';

revoke all on function public.get_monthly_leaderboard(text, integer) from public;
grant execute on function public.get_monthly_leaderboard(text, integer)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- certificates: allow service role writes; volunteers already select own
-- Ensure storage signed downloads work via service role / signed URLs in app.
-- ---------------------------------------------------------------------------

comment on table public.certificates is
  'Monthly Top 3 certificate metadata; PDF files live in private certificates bucket.';
