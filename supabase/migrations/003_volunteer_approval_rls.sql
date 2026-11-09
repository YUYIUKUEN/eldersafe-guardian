-- Volunteer approval: rejected status, tighten help-data RLS to approved only,
-- prevent self-changing approval_status, enable Realtime on volunteers.

-- ---------------------------------------------------------------------------
-- Allow approval_status = rejected
-- ---------------------------------------------------------------------------

alter table public.volunteers
  drop constraint if exists volunteers_approval_status_check;

alter table public.volunteers
  add constraint volunteers_approval_status_check
  check (approval_status in ('pending', 'approved', 'disabled', 'rejected'));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.current_volunteer_approval_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select approval_status from public.volunteers where id = auth.uid();
$$;

create or replace function public.is_approved_volunteer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.volunteers
    where id = auth.uid()
      and approval_status = 'approved'
  );
$$;

revoke all on function public.current_volunteer_approval_status() from public;
revoke all on function public.is_approved_volunteer() from public;
grant execute on function public.current_volunteer_approval_status() to authenticated;
grant execute on function public.is_approved_volunteer() to authenticated;

-- ---------------------------------------------------------------------------
-- Volunteers cannot change their own approval_status
-- ---------------------------------------------------------------------------

create or replace function public.prevent_volunteer_self_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.approval_status is distinct from old.approval_status
     and public.current_profile_role() is distinct from 'admin' then
    raise exception 'volunteers cannot change approval_status';
  end if;
  return new;
end;
$$;

drop trigger if exists volunteers_prevent_self_status_change on public.volunteers;
create trigger volunteers_prevent_self_status_change
  before update on public.volunteers
  for each row
  execute function public.prevent_volunteer_self_status_change();

-- ---------------------------------------------------------------------------
-- RLS: volunteers select / update
-- ---------------------------------------------------------------------------

drop policy if exists "volunteers_select_authenticated" on public.volunteers;
drop policy if exists "volunteers_select_own_admin_or_approved" on public.volunteers;
create policy "volunteers_select_own_admin_or_approved"
  on public.volunteers for select
  to authenticated
  using (
    id = auth.uid()
    or public.current_profile_role() = 'admin'
    or public.is_approved_volunteer()
  );

drop policy if exists "volunteers_update_own" on public.volunteers;
create policy "volunteers_update_own"
  on public.volunteers for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and approval_status = public.current_volunteer_approval_status()
  );

-- ---------------------------------------------------------------------------
-- RLS: help / elder / emergency / location data only for approved volunteers
-- ---------------------------------------------------------------------------

drop policy if exists "elders_volunteer_select" on public.elders;
create policy "elders_volunteer_select"
  on public.elders for select
  to authenticated
  using (
    public.is_approved_volunteer()
    and is_disabled = false
  );

drop policy if exists "help_requests_volunteer_select" on public.help_requests;
create policy "help_requests_volunteer_select"
  on public.help_requests for select
  to authenticated
  using (
    public.current_profile_role() = 'admin'
    or public.is_approved_volunteer()
  );

drop policy if exists "help_requests_volunteer_update_assigned" on public.help_requests;
create policy "help_requests_volunteer_update_assigned"
  on public.help_requests for update
  to authenticated
  using (
    public.current_profile_role() = 'admin'
    or (
      public.is_approved_volunteer()
      and (
        volunteer_id is null
        or volunteer_id = auth.uid()
      )
    )
  )
  with check (
    public.current_profile_role() = 'admin'
    or (
      public.is_approved_volunteer()
      and volunteer_id = auth.uid()
    )
  );

drop policy if exists "emergencies_authenticated_select" on public.emergencies;
create policy "emergencies_authenticated_select"
  on public.emergencies for select
  to authenticated
  using (
    public.current_profile_role() = 'admin'
    or public.is_approved_volunteer()
  );

drop policy if exists "locations_authenticated_select" on public.locations;
create policy "locations_authenticated_select"
  on public.locations for select
  to authenticated
  using (
    public.current_profile_role() = 'admin'
    or public.is_approved_volunteer()
  );

-- ---------------------------------------------------------------------------
-- Realtime: approval status changes
-- ---------------------------------------------------------------------------

do $$ begin
  alter publication supabase_realtime add table public.volunteers;
exception when duplicate_object then null; when others then null;
end $$;
