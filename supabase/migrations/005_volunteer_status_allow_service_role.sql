-- Allow service_role (seed / acceptance / backend scripts) to change
-- volunteers.approval_status. The 003 trigger only checked admin profile role,
-- which is null under the service role JWT and blocked legitimate updates.

create or replace function public.prevent_volunteer_self_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.approval_status is distinct from old.approval_status
     and coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role'
     and public.current_profile_role() is distinct from 'admin' then
    raise exception 'volunteers cannot change approval_status';
  end if;
  return new;
end;
$$;
