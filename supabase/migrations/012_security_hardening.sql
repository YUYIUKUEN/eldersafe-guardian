-- Security hardening from integration audit:
-- C0  profiles: block self role escalation
-- C2  storage: no authenticated object listing/download (signed URLs via service role)
-- C3  emergencies: admin-only (volunteers must not see police_share_token)
-- H2  help_requests: volunteers mutate only via accept/release/complete RPCs
-- H4  activity_logs: insert must match caller identity/role
-- Extra: volunteers cannot SELECT peer PII rows (own + admin only)

-- ---------------------------------------------------------------------------
-- C0: prevent role self-escalation
-- ---------------------------------------------------------------------------

create or replace function public.prevent_profile_role_self_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and public.current_profile_role() is distinct from 'admin' then
    raise exception 'profiles.role can only be changed by an admin';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_self_change on public.profiles;
create trigger profiles_prevent_role_self_change
  before update on public.profiles
  for each row
  execute function public.prevent_profile_role_self_change();

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = public.current_profile_role()
  );

-- ---------------------------------------------------------------------------
-- C3: emergencies readable by admin only
-- ---------------------------------------------------------------------------

drop policy if exists "emergencies_authenticated_select" on public.emergencies;
create policy "emergencies_admin_select"
  on public.emergencies for select
  to authenticated
  using (public.current_profile_role() = 'admin');

-- Locations attached to emergencies: admin only (help_request trails stay via 008)
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
-- H2: volunteers cannot direct-UPDATE help_requests (use RPCs)
-- ---------------------------------------------------------------------------

drop policy if exists "help_requests_volunteer_update_assigned" on public.help_requests;

-- ---------------------------------------------------------------------------
-- C2: storage private — remove authenticated reads on recording buckets.
-- Signed URLs are created with the service role after access checks in app APIs.
-- ---------------------------------------------------------------------------

drop policy if exists "voice_recordings_authenticated_read" on storage.objects;
drop policy if exists "voice_recordings_approved_volunteer_read" on storage.objects;
drop policy if exists "recordings_authenticated_read" on storage.objects;

-- ---------------------------------------------------------------------------
-- H4: activity_logs insert must match the authenticated actor
-- (elder/system writes use service_role and bypass RLS)
-- ---------------------------------------------------------------------------

drop policy if exists "activity_logs_authenticated_insert" on public.activity_logs;
create policy "activity_logs_authenticated_insert"
  on public.activity_logs for insert
  to authenticated
  with check (
    actor_id = auth.uid()::text
    and (
      (
        actor_type = 'volunteer'
        and public.current_profile_role() = 'volunteer'
      )
      or (
        actor_type = 'admin'
        and public.current_profile_role() = 'admin'
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Peer volunteer PII: own row or admin only
-- ---------------------------------------------------------------------------

drop policy if exists "volunteers_select_own_admin_or_approved" on public.volunteers;
drop policy if exists "volunteers_select_authenticated" on public.volunteers;
create policy "volunteers_select_own_or_admin"
  on public.volunteers for select
  to authenticated
  using (
    id = auth.uid()
    or public.current_profile_role() = 'admin'
  );
