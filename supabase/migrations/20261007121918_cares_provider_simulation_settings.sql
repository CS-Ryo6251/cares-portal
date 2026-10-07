begin;
alter table public.facility_portal_profiles add column simulation_settings jsonb;
alter table public.facility_portal_profiles add constraint facility_portal_simulation_settings_object
  check (simulation_settings is null or jsonb_typeof(simulation_settings) = 'object');
comment on column public.facility_portal_profiles.simulation_settings is 'Published provider tariff conditions for Cares: service type, group, area, filed add-ons, effective months and server confirmation timestamp. Existing profile publication RLS applies.';
commit;
