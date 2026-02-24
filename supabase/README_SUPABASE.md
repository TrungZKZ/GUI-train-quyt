# Supabase setup for PlutoSo (public feed + private media)

This repo is a static frontend (GitHub Pages) + Supabase backend.

## Goal
- Public feed readable by anyone
- Media stored in **private** bucket
- Frontend requests **signed URLs** (5 minutes) from an Edge Function

## 0) Create project
Project ref: `cvjhfjadnczqrkpvzetl`
API URL: `https://cvjhfjadnczqrkpvzetl.supabase.co`

## 1) Storage
Create bucket:
- name: `media`
- **private**: ON

## 2) SQL (run in SQL editor)

### Tables
```sql
create table if not exists public.posts (
  id bigserial primary key,
  user_id uuid not null,
  display_name text,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.post_media (
  id bigserial primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  bucket text not null default 'media',
  path text not null,
  media_type text not null check (media_type in ('image','video')),
  file_name text,
  created_at timestamptz not null default now()
);

create index if not exists post_media_post_id_idx on public.post_media(post_id);
create index if not exists post_media_bucket_path_idx on public.post_media(bucket, path);
```

### RLS policies (public read, auth write)
```sql
alter table public.posts enable row level security;
alter table public.post_media enable row level security;

-- Public read
create policy if not exists posts_read_all
on public.posts for select
to anon, authenticated
using (true);

create policy if not exists post_media_read_all
on public.post_media for select
to anon, authenticated
using (true);

-- Auth write
create policy if not exists posts_insert_auth
on public.posts for insert
to authenticated
with check (auth.uid() = user_id);

create policy if not exists post_media_insert_auth
on public.post_media for insert
to authenticated
with check (true);
```

### Storage policies
Bucket is private. We allow authenticated users to upload into their own folder.

```sql
-- Storage RLS is on storage.objects
-- Allow authenticated upload to bucket 'media' under folder = auth.uid()
create policy if not exists "media_upload_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated to update/delete their own objects
create policy if not exists "media_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy if not exists "media_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

## 3) Edge Function (signed URLs)
This repo includes an edge function:
- `supabase/functions/sign-media/index.ts`

Deploy it:
```bash
supabase functions deploy sign-media
```

Set required secrets for the function (server-side):
```bash
# Either set PLUTOSO_* secrets (recommended) or SUPABASE_* secrets if your CLI allows.
# Preferred:
# supabase secrets set PLUTOSO_SUPABASE_URL="https://cvjhfjadnczqrkpvzetl.supabase.co"
# supabase secrets set PLUTOSO_SERVICE_ROLE_KEY="<YOUR_SERVICE_ROLE_KEY>"
#
# Fallback:
# supabase secrets set SUPABASE_URL="https://cvjhfjadnczqrkpvzetl.supabase.co"
# supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<YOUR_SERVICE_ROLE_KEY>"
```

## 4) Frontend config
The frontend uses:
- SUPABASE_URL
- SUPABASE_ANON_KEY (publishable)

Never embed service_role/secret key in frontend.

