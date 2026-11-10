-- activity_logs is append-only: allow INSERT (+ admin SELECT via RLS),
-- never UPDATE or DELETE at the privilege or trigger layer.

revoke update, delete on table public.activity_logs from anon, authenticated, public;

-- Keep explicit grants aligned with RLS policies in 001_init.sql
grant select, insert on table public.activity_logs to authenticated;

create or replace function public.forbid_activity_logs_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'activity_logs is append-only; update/delete are not allowed';
end;
$$;

drop trigger if exists activity_logs_forbid_update on public.activity_logs;
create trigger activity_logs_forbid_update
  before update on public.activity_logs
  for each row
  execute function public.forbid_activity_logs_mutation();

drop trigger if exists activity_logs_forbid_delete on public.activity_logs;
create trigger activity_logs_forbid_delete
  before delete on public.activity_logs
  for each row
  execute function public.forbid_activity_logs_mutation();
