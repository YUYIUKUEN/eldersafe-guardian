-- Private bucket for elder voice help recordings (service-role uploads).
insert into storage.buckets (id, name, public)
values ('voice-recordings', 'voice-recordings', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "voice_recordings_authenticated_read" on storage.objects;
create policy "voice_recordings_authenticated_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'voice-recordings');
