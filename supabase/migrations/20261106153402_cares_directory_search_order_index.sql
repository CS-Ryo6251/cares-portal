-- Match the homepage ordering so LIMIT can stop before scanning/sorting every listing.
-- Additive index only: no data, publication, or permission changes.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '60s';
create index if not exists cares_listings_directory_order_idx
  on public.cares_listings (is_owner_verified desc, completeness_score desc nulls last, facility_name asc);
commit;
