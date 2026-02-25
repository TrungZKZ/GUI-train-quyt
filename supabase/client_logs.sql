-- PlutoSo: client-side error logs

create table if not exists public.client_logs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  level text not null default 'error',
  message text,
  stack text,
  url text,
  user_agent text,
  app_version text,
  context jsonb
);

alter table public.client_logs enable row level security;

-- Public insert only (no select) so anyone can report errors.
-- Note: this is intentionally open for debugging; consider rate limiting later.
drop policy if exists client_logs_insert_all on public.client_logs;
create policy client_logs_insert_all
on public.client_logs
for insert
to anon, authenticated
with check (true);

-- Deny selects by default (no policy for select).
