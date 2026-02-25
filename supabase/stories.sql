-- PlutoSo: Stories (server)

create table if not exists public.stories (
  id bigserial primary key,
  user_id uuid not null,
  display_name text,
  bucket text not null default 'Social',
  path text not null,
  media_type text not null check (media_type in ('image','video')),
  file_name text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists stories_created_at_idx on public.stories(created_at desc);
create index if not exists stories_bucket_path_idx on public.stories(bucket, path);

alter table public.stories enable row level security;

-- Public read (only non-expired)
drop policy if exists stories_read_public on public.stories;
create policy stories_read_public
on public.stories
for select
to anon, authenticated
using (expires_at > now());

-- Auth write (must match user_id)
drop policy if exists stories_insert_auth on public.stories;
create policy stories_insert_auth
on public.stories
for insert
to authenticated
with check (auth.uid() = user_id);
