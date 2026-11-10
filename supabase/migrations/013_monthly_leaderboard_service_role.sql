-- Allow service_role callers (admin API / scripts) to run monthly leaderboard RPC.
-- Admin portal loads rankings via service client; auth.uid() is null in that
-- path, so the previous admin/volunteer-only gate raised FORBIDDEN and the
-- admin "排行榜與證書" page showed loadFailed with an empty Top 10.

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

  if coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role'
     and public.current_profile_role() is distinct from 'admin'
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
  'Top N volunteers for a Hong Kong calendar month (points, then completed services). Callable by admin, approved volunteer, or service_role.';

revoke all on function public.get_monthly_leaderboard(text, integer) from public;
grant execute on function public.get_monthly_leaderboard(text, integer)
  to authenticated, service_role;
