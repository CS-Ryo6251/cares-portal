-- Keep earlier community uploads visible when multiple listings become one verified facility.
begin;
create or replace function public.cares_brochure_list(p_listing uuid default null,p_user uuid default null,p_mode text default 'public',p_id uuid default null,p_offset integer default 0)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; more boolean; summary jsonb;
begin
 if p_mode not in ('public','shared','saved') or p_offset is null or p_offset<0 or p_offset>100000
 or (p_mode<>'public' and p_user is null) or (p_mode='public' and p_listing is null and p_id is null) then
 raise exception 'Invalid brochure query' using errcode='22023'; end if;
 with scope as (
  select id from public.cares_listings where id=p_listing
  union
  select related.id from public.cares_listings requested
  join public.cares_listings related on related.owner_facility_id=requested.owner_facility_id and related.is_owner_verified
  where requested.id=p_listing and requested.is_owner_verified and requested.owner_facility_id is not null
 ), matching as (
  select b.*,l.facility_name from public.cares_brochures b join public.cares_listings l on l.id=b.listing_id
  where (p_id is null or b.id=p_id) and
   ((p_mode='public' and b.status='published' and (p_listing is null or b.listing_id in (select id from scope)))
    or (p_mode='shared' and b.user_id=p_user and b.status<>'deleted')
    or (p_mode='saved' and b.status='published' and exists(select 1 from public.cares_brochure_actions a where a.brochure_id=b.id and a.user_id=p_user and a.kind='saved')))
  order by b.created_at desc,b.id desc limit 21 offset p_offset
 ), visible as (select * from matching order by created_at desc,id desc limit 20)
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',b.id,'listingId',b.listing_id,'facilityName',b.facility_name,'title',b.title,'note',b.note,
  'issuedMonth',b.issued_month,'createdAt',b.created_at,'updatedAt',b.updated_at,'status',b.status,'mine',coalesce(b.user_id=p_user,false),
  'files',(select jsonb_agg(jsonb_build_object('index',n-1,'mime',f->>'mime','size',(f->>'size')::integer) order by n) from jsonb_array_elements(b.files) with ordinality as file(f,n)),
  'helpfulCount',(select count(*) from public.cares_brochure_actions a where a.brochure_id=b.id and a.kind='helpful'),
  'helpful',exists(select 1 from public.cares_brochure_actions a where a.brochure_id=b.id and a.user_id=p_user and a.kind='helpful'),
  'saved',exists(select 1 from public.cares_brochure_actions a where a.brochure_id=b.id and a.user_id=p_user and a.kind='saved')
 ) order by b.created_at desc,b.id desc),'[]'::jsonb),(select count(*)>20 from matching) into result,more from visible b;
 if p_mode<>'public' then
 select jsonb_build_object(
  'shared',(select count(*) from public.cares_brochures where user_id=p_user and status<>'deleted'),
  'saved',(select count(*) from public.cares_brochure_actions a join public.cares_brochures b on b.id=a.brochure_id where a.user_id=p_user and a.kind='saved' and b.status='published'),
  'helpful',(select count(*) from public.cares_brochure_actions a join public.cares_brochures b on b.id=a.brochure_id where b.user_id=p_user and a.kind='helpful' and b.status='published')
 ) into summary;
 end if;
 return jsonb_build_object('items',result,'hasMore',more,'nextOffset',p_offset+20,'summary',summary);
end; $$;

commit;
