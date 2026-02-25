-- Allow authenticated users to delete their own posts

alter table public.posts enable row level security;

drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own
on public.posts
for delete
to authenticated
using (auth.uid() = user_id);
