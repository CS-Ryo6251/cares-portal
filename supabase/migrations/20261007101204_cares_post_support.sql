begin;
-- Likes remain one row per user/post. Only aggregates are public.
revoke all on public.cares_likes from public, anon, authenticated;
grant select, insert, delete on public.cares_likes to authenticated;
grant all on public.cares_likes to service_role;
alter table public.cares_likes enable row level security;
drop policy if exists cares_likes_select_all on public.cares_likes;
drop policy if exists cares_likes_insert_own on public.cares_likes;
drop policy if exists cares_likes_delete_own on public.cares_likes;
create policy cares_likes_select_own on public.cares_likes for select to authenticated using ((select auth.uid())=user_id);
create policy cares_likes_delete_own on public.cares_likes for delete to authenticated using ((select auth.uid())=user_id);
create policy cares_likes_insert_published on public.cares_likes for insert to authenticated with check (
  (select auth.uid())=user_id and exists (
    select 1 from public.facility_portal_posts p join public.facility_portal_profiles pr on pr.id=p.profile_id and pr.facility_id=p.facility_id
    where p.id=post_id and p.status='published' and pr.is_published
  )
);

-- The previous invoker trigger could not update posts through reader RLS.
-- This private trigger can update counters only; users cannot call it or set a count.
create schema if not exists cares_internal;
revoke all on schema cares_internal from public, anon, authenticated;
create function cares_internal.update_post_like_count() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' then
    update public.facility_portal_posts set like_count=coalesce(like_count,0)+1 where id=new.post_id;
    return new;
  else
    update public.facility_portal_posts set like_count=greatest(coalesce(like_count,0)-1,0) where id=old.post_id;
    return old;
  end if;
end;
$$;
revoke all on function cares_internal.update_post_like_count() from public, anon, authenticated;
drop trigger if exists cares_likes_count_trigger on public.cares_likes;
create trigger cares_likes_count_trigger after insert or delete on public.cares_likes for each row execute function cares_internal.update_post_like_count();

-- Hearts/views are not edits to the business's published information.
create or replace function public.update_portal_last_activity() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='UPDATE' and (to_jsonb(new)-'like_count'-'view_count'-'favorite_count')=(to_jsonb(old)-'like_count'-'view_count'-'favorite_count') then return new; end if;
  update public.facility_portal_profiles set last_activity_at=now() where facility_id=new.facility_id;
  return new;
end;
$$;
update public.facility_portal_posts p set like_count=(select count(*) from public.cares_likes l where l.post_id=p.id)
where like_count is distinct from (select count(*) from public.cares_likes l where l.post_id=p.id);
create index if not exists cares_listings_verified_facility on public.cares_listings(owner_facility_id) where is_owner_verified=true;

-- Additive views keep the original direct-heart view/RPC backward compatible.
-- A facility's posts are summed once, regardless of how many service listings it has.
create view public.cares_facility_support_summary with (security_invoker=true) as
select pr.facility_id,
 (d.total+p.total)::text as total, d.total::text as direct_total, p.total::text as post_total
from public.facility_portal_profiles pr
cross join lateral (
 select coalesce(sum(h.total),0) as total from public.cares_listings l
 left join public.cares_listing_heart_totals h on h.listing_id=l.id
 where l.owner_facility_id=pr.facility_id and l.is_owner_verified
) d
cross join lateral (
 select coalesce(sum(p.like_count),0)::numeric as total from public.facility_portal_posts p
 where p.facility_id=pr.facility_id and p.profile_id=pr.id and p.status='published'
) p
where pr.is_published;
create view public.cares_listing_support_summary with (security_invoker=true) as
select l.id as listing_id, s.facility_id,
 coalesce(s.total,h.total::text,'0') as total,
 coalesce(s.direct_total,h.total::text,'0') as direct_total,
 coalesce(s.post_total,'0') as post_total
from public.cares_listings l
left join public.cares_facility_support_summary s on l.is_owner_verified and l.owner_facility_id=s.facility_id
left join public.cares_listing_heart_totals h on h.listing_id=l.id;
revoke all on public.cares_facility_support_summary,public.cares_listing_support_summary from public,anon,authenticated;
grant select on public.cares_facility_support_summary,public.cares_listing_support_summary to anon,authenticated,service_role;

-- Server-only management aggregate. API callers must authorize facility membership first.
create function public.cares_facility_support(p_facility_id uuid,p_as_of timestamptz default now()) returns jsonb
language sql stable security invoker set search_path='' as $$
with listings as (
 select id from public.cares_listings where owner_facility_id=p_facility_id and is_owner_verified
), posts as (
 select p.id,p.title,p.content,p.created_at from public.facility_portal_posts p
 join public.facility_portal_profiles pr on pr.id=p.profile_id and pr.facility_id=p.facility_id
 where p.facility_id=p_facility_id and p.status='published' and pr.is_published
), post_stats as (
 select p.id,p.title,p.content,p.created_at,count(l.id) as total,
 count(l.id) filter(where l.created_at>=p_as_of-interval '7 days' and l.created_at<=p_as_of) as recent
 from posts p left join public.cares_likes l on l.post_id=p.id group by p.id,p.title,p.content,p.created_at
), totals as (
 select coalesce((select sum(h.total) from public.cares_listing_heart_totals h join listings l on l.id=h.listing_id),0) as direct_total,
 coalesce((select sum(total) from post_stats),0) as post_total,
 (select count(*) from public.cares_guest_heart_requests r join listings l on l.id=r.listing_id where r.created_at>=p_as_of-interval '7 days' and r.created_at<=p_as_of)
 +(select count(*) from public.cares_listing_heart_requests r join listings l on l.id=r.listing_id where r.created_at>=p_as_of-interval '7 days' and r.created_at<=p_as_of) as direct_recent,
 coalesce((select sum(recent) from post_stats),0) as post_recent
)
select jsonb_build_object(
 'status',case when exists(select 1 from listings) or exists(select 1 from public.facility_portal_profiles where facility_id=p_facility_id and is_published) then 'ready' else 'unlinked' end,
 'total',(direct_total+post_total)::text,'recent',(direct_recent+post_recent)::text,
 'direct',direct_total::text,'posts',post_total::text,'recentDirect',direct_recent::text,'recentPosts',post_recent::text,'asOf',p_as_of,
 'topPosts',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',coalesce(nullif(title,''),left(content,40),'投稿'),'total',total::text,'recent',recent::text) order by recent desc,total desc,created_at desc,id)
 from (select * from post_stats where recent>0 order by recent desc,total desc,created_at desc,id limit 3) ranked),'[]'::jsonb)
) from totals;
$$;
revoke all on function public.cares_facility_support(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.cares_facility_support(uuid,timestamptz) to service_role;
commit;
