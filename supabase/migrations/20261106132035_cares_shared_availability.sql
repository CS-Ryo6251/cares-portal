-- Apply after the OS service_availability_public contract migration.
begin;
create view public.cares_current_availability with (security_invoker = true) as
select l.id as listing_id,
  case when p.target_id is not null then
    case p.status when 'available' then 'has_vacancy' when 'conditional' then 'conditional' when 'unavailable' then 'no_vacancy' else 'unknown' end
  when v.confirmed_on <= (now() at time zone 'Asia/Tokyo')::date and v.valid_until >= (now() at time zone 'Asia/Tokyo')::date
    then v.vacancy_type else 'unknown' end as status,
  p.target_id is not null as provider_managed, p.target_id, p.version,
  coalesce(p.summary, '{}'::jsonb) as summary, p.checked_at, p.valid_until, p.evidence,
  p.recruitment_post_id, p.recruitment_status, coalesce(p.published, false) as published
from public.cares_listings l
left join public.service_availability_public p on p.listing_id = l.id
left join public.cares_latest_vacancies v on v.listing_id = l.id;
revoke all on public.cares_current_availability from public, anon, authenticated;
grant select on public.cares_current_availability to anon, authenticated, service_role;

-- Expose only public listing IDs, never the private source aliases or targets.
-- Old snapshots disappear from search. A verified current-source alias retains
-- the canonical URL only while its provider link remains valid.
create view public.cares_searchable_welfare_listings with (security_barrier = true) as
select l.id from public.cares_listings l where l.source_kind = 'welfare' and (
  exists(select 1 from public.welfare_directory_entries e
    join public.welfare_directory_snapshots s on s.id=e.snapshot_id
    where e.id=l.source_entry_id and e.service_type=l.service_type and e.searchable and s.state='active')
  or exists(select 1 from public.service_availability_targets t
    join public.service_availability_target_aliases a on a.target_id=t.id and a.source_kind='welfare'
    join public.welfare_directory_entries e on e.id=a.source_entry_id and e.service_type=t.service_type and e.searchable
    join public.welfare_directory_snapshots s on s.id=e.snapshot_id and s.state='active'
    join public.facility_directory_links d on d.directory_entry_id=e.id and d.facility_id=t.facility_id and d.verification_status='verified' and d.retired_at is null
    join public.facilities f on f.id=t.facility_id and f.status='active' and f.service_type=t.service_type
    where t.listing_id=l.id and t.service_type=l.service_type)
);
revoke all on public.cares_searchable_welfare_listings from public,anon,authenticated;
grant select on public.cares_searchable_welfare_listings to anon,authenticated,service_role;

-- The legacy views used l.*. Adding source columns to cares_listings must not
-- shift current_acceptance_status (CREATE OR REPLACE cannot rename columns).
-- Retain the actual existing view order and append newly added listing columns.
do $$
declare view_name text; columns_sql text; additions_sql text;
begin
  foreach view_name in array array['cares_directory_listing','cares_confirmed_directory_listing'] loop
    select string_agg(case when a.attname = 'current_acceptance_status' then 'a.status as current_acceptance_status' else format('l.%I', a.attname) end, ', ' order by a.attnum)
      into columns_sql from pg_attribute a where a.attrelid = ('public.' || view_name)::regclass and a.attnum > 0 and not a.attisdropped;
    select string_agg(format('l.%I', a.attname), ', ' order by a.attnum) into additions_sql
      from pg_attribute a where a.attrelid = 'public.cares_listings'::regclass and a.attnum > 0 and not a.attisdropped
      and not exists(select 1 from pg_attribute old where old.attrelid = ('public.' || view_name)::regclass and old.attname = a.attname and old.attnum > 0 and not old.attisdropped);
    execute format('create or replace view public.%I with (security_invoker = true) as select %s%s from public.cares_listings l join public.cares_current_availability a on a.listing_id = l.id %s',
      view_name, columns_sql, case when additions_sql is null then '' else ', ' || additions_sql end,
      'where (l.source_kind is distinct from ''welfare'' or exists(select 1 from public.cares_searchable_welfare_listings w where w.id=l.id))' ||
      case when view_name = 'cares_confirmed_directory_listing' then ' and a.status in (''has_vacancy'',''conditional'',''no_vacancy'')' else '' end);
  end loop;
end $$;
commit;
