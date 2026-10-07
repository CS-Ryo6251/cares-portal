begin;
create or replace function public.cares_support_ranking(
 p_period text default 'week', p_prefecture text default '', p_service_type text default '', p_as_of timestamptz default now()
) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_start timestamptz; v_items jsonb;
begin
 if p_period is null or p_period not in ('week','all') or p_as_of is null then
  raise exception 'Invalid ranking period' using errcode='22023';
 end if;
 v_start := date_trunc('week',p_as_of at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo';
 with direct_events as (
  select h.listing_id,h.total as amount from public.cares_listing_heart_totals h where p_period='all' and h.total>0
  union all
  select r.listing_id,count(*)::numeric from public.cares_guest_heart_requests r where p_period='week' and r.created_at>=v_start and r.created_at<=p_as_of group by r.listing_id
  union all
  select r.listing_id,count(*)::numeric from public.cares_listing_heart_requests r where p_period='week' and r.created_at>=v_start and r.created_at<=p_as_of group by r.listing_id
 ), direct_scores as (
  select case when pr.facility_id is not null then 'facility:'||pr.facility_id::text else 'listing:'||l.id::text end as entity,
   sum(e.amount) as direct,0::numeric as posts
  from direct_events e join public.cares_listings l on l.id=e.listing_id
  left join public.facility_portal_profiles pr on l.is_owner_verified and pr.facility_id=l.owner_facility_id and pr.is_published
  group by 1
 ), post_scores as (
  select 'facility:'||pr.facility_id::text as entity,0::numeric as direct,
   case when p_period='all' then sum(coalesce(p.like_count,0))::numeric
    else sum((select count(*) from public.cares_likes likes where likes.post_id=p.id and likes.created_at>=v_start and likes.created_at<=p_as_of)) end as posts
  from public.facility_portal_profiles pr join public.facility_portal_posts p on p.profile_id=pr.id and p.facility_id=pr.facility_id and p.status='published'
  where pr.is_published group by pr.facility_id
 ), totals as (
  select entity,sum(direct) as direct,sum(posts) as posts,sum(direct+posts) as total
  from (select * from direct_scores union all select * from post_scores) s group by entity having sum(direct+posts)>0
 ), candidates as (
  select l.id,l.facility_name,l.service_type,l.prefecture,l.address,pr.cover_image_url,
   coalesce(nullif(pr.overview,''),l.overview) as overview,t.total,t.direct,t.posts,
   row_number() over(partition by t.entity order by l.jigyosho_number nulls last,l.id) as entry
  from totals t join public.cares_listings l on
   ((t.entity like 'listing:%' and l.id=split_part(t.entity,':',2)::uuid)
    or (t.entity like 'facility:%' and l.is_owner_verified and l.owner_facility_id=split_part(t.entity,':',2)::uuid))
  left join public.facility_portal_profiles pr on l.is_owner_verified and pr.facility_id=l.owner_facility_id and pr.is_published
  where (coalesce(p_prefecture,'')='' or l.prefecture=p_prefecture)
   and (coalesce(p_service_type,'')='' or l.service_type=p_service_type)
 ), ranked as (
  select *,rank() over(order by total desc) as position from candidates where entry=1
 ), limited as (
  select * from ranked order by total desc,facility_name,id limit 50
 ) select coalesce(jsonb_agg(jsonb_build_object(
  'id',id,'name',facility_name,'serviceType',service_type,'prefecture',prefecture,'address',address,
  'coverImage',cover_image_url,'overview',left(overview,180),'rank',position,
  'total',total::text,'direct',direct::text,'posts',posts::text
 ) order by total desc,facility_name,id),'[]'::jsonb) into v_items from limited;
 return jsonb_build_object('period',p_period,'asOf',p_as_of,'periodStart',case when p_period='week' then v_start end,'items',v_items);
end;
$$;
revoke all on function public.cares_support_ranking(text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.cares_support_ranking(text,text,text,timestamptz) to service_role;
commit;
