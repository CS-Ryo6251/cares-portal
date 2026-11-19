-- Append only the consented current recruitment copy. Keep the existing masked
-- public boundary: callers cannot read raw projections or service_posts through it.
-- security_invoker is intentionally NOT used for this sanitizing view, just as
-- in the original definition; the source tables are not granted to anon.
begin;
create or replace view public.service_availability_public with (security_barrier=true) as
 select m.target_id,m.listing_id,m.facility_id,m.service_type,m.version,
 case when p.published and p.valid_until >= (now() at time zone 'Asia/Tokyo')::date then p.status else 'unknown' end as status,
 case when p.published and p.valid_until >= (now() at time zone 'Asia/Tokyo')::date then public.service_availability_public_summary(p.summary,m.service_type) else '{}'::jsonb end as summary,
 p.checked_at,p.valid_until,p.evidence,p.recruitment_post_id,
 case when p.published and p.valid_until >= (now() at time zone 'Asia/Tokyo')::date then p.recruitment_status else 'expired' end as recruitment_status,
 coalesce(p.published and p.valid_until >= (now() at time zone 'Asia/Tokyo')::date,false) as published,
 r.title as recruitment_title,r.content as recruitment_content
 from public.service_availability_public_markers m
 left join public.service_availability_projection p on p.target_id=m.target_id
 left join public.service_posts r on r.id=p.recruitment_post_id
   and p.published and p.valid_until >= (now() at time zone 'Asia/Tokyo')::date
   and p.status in ('available','conditional') and p.recruitment_status='active'
   and p.version=m.version and r.facility_id=m.facility_id
   and r.type='acceptUsers' and r.status='active'
   and r.service_details->>'visibility'='public' and r.service_details->>'publishToCares'='true'
   and r.service_details->>'availabilityTargetId'=m.target_id::text
   and r.service_details->>'availabilityVersion'=m.version::text;

create or replace view public.cares_current_availability with (security_invoker=true) as
 select l.id as listing_id,
 case when p.target_id is not null then case p.status when 'available' then 'has_vacancy' when 'conditional' then 'conditional' when 'unavailable' then 'no_vacancy' else 'unknown' end
   when v.confirmed_on <= (now() at time zone 'Asia/Tokyo')::date and v.valid_until >= (now() at time zone 'Asia/Tokyo')::date then v.vacancy_type else 'unknown' end as status,
 p.target_id is not null as provider_managed,p.target_id,p.version,coalesce(p.summary,'{}'::jsonb) as summary,
 p.checked_at,p.valid_until,p.evidence,p.recruitment_post_id,p.recruitment_status,coalesce(p.published,false) as published,
 p.recruitment_title,p.recruitment_content
 from public.cares_listings l left join public.service_availability_public p on p.listing_id=l.id
 left join public.cares_latest_vacancies v on v.listing_id=l.id;
commit;
