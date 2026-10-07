-- Start known-availability searches with the latest reports, not all listings.
-- Filtering after DISTINCT ON preserves the rule that an expired latest report
-- must never reveal an older, still-dated report.
create view public.cares_confirmed_directory_listing with (security_invoker = true) as
  select l.*, v.vacancy_type as current_acceptance_status
  from public.cares_latest_vacancies v
  join public.cares_listings l on l.id = v.listing_id
  where v.confirmed_on <= (now() at time zone 'Asia/Tokyo')::date
    and v.valid_until >= (now() at time zone 'Asia/Tokyo')::date;
revoke all on public.cares_confirmed_directory_listing from public, anon, authenticated;
grant select on public.cares_confirmed_directory_listing to anon, authenticated, service_role;
