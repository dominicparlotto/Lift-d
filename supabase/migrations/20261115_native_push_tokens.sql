-- iPhone app push: one row per device token from Apple. Applied 2026-11-15 (migration "native_push_tokens").
create table public.native_push_tokens (
  token text primary key check (token ~ '^[0-9a-f]{32,200}$'),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  environment text not null default 'production' check (environment in ('production', 'sandbox')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index native_push_tokens_user_idx on public.native_push_tokens (user_id);
alter table public.native_push_tokens enable row level security;
-- People can see and remove their own tokens; saving goes through register_native_push().
create policy "Own push tokens are readable" on public.native_push_tokens for select to authenticated using (user_id = (select auth.uid()));
create policy "Own push tokens are deletable" on public.native_push_tokens for delete to authenticated using (user_id = (select auth.uid()));
revoke insert, update on public.native_push_tokens from anon, authenticated;

-- Save this phone's token for whoever is signed in now (a phone that switched accounts moves its token over).
create or replace function public.register_native_push(p_token text) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); t text := lower(trim(p_token));
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if t !~ '^[0-9a-f]{32,200}$' then raise exception 'invalid push token' using errcode = '22023'; end if;
  if exists (select 1 from public.profiles where id = me and banned_at is not null) then
    raise exception 'banned' using errcode = '42501';
  end if;
  insert into public.native_push_tokens (token, user_id) values (t, me)
  on conflict (token) do update set user_id = excluded.user_id, updated_at = now();
end $$;
revoke all on function public.register_native_push(text) from public, anon;
grant execute on function public.register_native_push(text) to authenticated;

-- Banning also stops iPhone pushes.
create or replace function private.ban_user(u uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if u is null or exists (select 1 from public.admins a where a.user_id = u) then return; end if;  -- never ban an admin
  update public.profiles set banned_at = coalesce(banned_at, now()) where id = u;
  update auth.users set banned_until = '2999-12-31 00:00:00+00' where id = u;
  delete from auth.sessions where user_id = u;
  delete from public.push_subscriptions where user_id = u;
  delete from public.native_push_tokens where user_id = u;
  delete from public.gym_checkins where user_id = u;
end $$;
