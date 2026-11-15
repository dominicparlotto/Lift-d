-- Followers / Following lists (Instagram-style). Applied 2026-11-15 (migration "follow_lists").
-- Same visibility as posts: your own lists, or a public account's, or a private account you're an approved follower of.
-- Blocked (either way) and banned accounts are left out of the list.
create or replace function public.follow_list(p_user uuid, p_kind text)
returns table (id uuid, username text, name text, avatar_url text, is_private boolean, followed_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.name, p.avatar_url, p.is_private, f.created_at
  from public.follows f
  join public.profiles p on p.id = case when p_kind = 'followers' then f.follower_id else f.following_id end
  where (select auth.uid()) is not null
    and p_kind in ('followers', 'following')
    and f.status = 'accepted'
    and (case when p_kind = 'followers' then f.following_id else f.follower_id end) = p_user
    and private.can_see_posts((select auth.uid()), p_user)
    and p.banned_at is null
    and not private.is_blocked_between((select auth.uid()), p.id)
  order by f.created_at desc
  limit 2000;
$$;
revoke all on function public.follow_list(uuid, text) from public, anon;
grant execute on function public.follow_list(uuid, text) to authenticated;
