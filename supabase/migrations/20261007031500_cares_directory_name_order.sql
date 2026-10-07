-- The nationwide directory has about 180,000 listings. Support the default
-- alphabetical page directly instead of sorting the full joined directory.
create index cares_listings_name_order on public.cares_listings (facility_name);
