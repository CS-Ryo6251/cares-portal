-- The old settings RPC must not keep a second, unversioned vacancy write path.
begin;
alter table public.cares_intake_settings add column availability_version integer, add column message_confirmed_on date, add column message_valid_until date;
create table public.cares_availability_operations (
  listing_id uuid not null references public.cares_listings(id), operation_id uuid not null,
  payload jsonb not null, result jsonb not null, created_at timestamptz not null default now(),
  primary key(listing_id, operation_id)
);
alter table public.cares_availability_operations enable row level security;
revoke all on public.cares_availability_operations from public, anon, authenticated;
grant all on public.cares_availability_operations to service_role;
create or replace function public.cares_intake_update_settings(p_user uuid, p_listing uuid, p_enabled boolean, p_message text, p_status text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'availability_update_requires_version' using errcode = '40001';
end $$;

create function public.cares_intake_save_availability(
  p_user uuid, p_listing uuid, p_enabled boolean, p_message text, p_status text,
  p_expected_version integer, p_operation_id uuid, p_publish_cares boolean, p_valid_until date, p_message_confirmed boolean default false
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare target uuid; current_state public.service_availability_current%rowtype; result jsonb; payload jsonb; previous public.cares_availability_operations%rowtype;
begin
  if not exists(select 1 from public.cares_intake_recipients(p_listing) where user_id = p_user) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('available','conditional','unavailable','unknown') or p_message is null or length(p_message) > 1000
    or p_publish_cares is null or p_enabled is null or p_message_confirmed is null then raise exception 'invalid availability'; end if;
  target := public.ensure_service_availability_target('cares', p_listing);
  perform 1 from public.service_availability_targets where id = target for update;
  payload := jsonb_build_object('user',p_user,'enabled',p_enabled,'message',p_message,'status',p_status,'version',p_expected_version,'publish',p_publish_cares,'valid_until',p_valid_until,'message_confirmed',p_message_confirmed);
  select * into previous from public.cares_availability_operations where listing_id = p_listing and operation_id = p_operation_id;
  if found then
    if previous.payload <> payload then raise exception 'idempotency conflict'; end if;
    return previous.result;
  end if;
  select * into current_state from public.service_availability_current where target_id = target;
  -- Keep calendar details and their separate confirmation/expiry unchanged.
  result := public.service_availability_save(target, p_expected_version, p_operation_id, p_status,
    coalesce(current_state.summary, '{}'::jsonb), p_publish_cares, coalesce(current_state.share_os, false), p_valid_until,
    p_user, 'provider_verified', current_state.recruitment_post_id);
  insert into public.cares_intake_settings as settings(listing_id, enabled, vacancy_message, availability_version, message_confirmed_on, message_valid_until)
    values(p_listing, p_enabled, p_message, (result->>'version')::integer,
      case when p_message_confirmed then (now() at time zone 'Asia/Tokyo')::date end,
      case when p_message_confirmed then p_valid_until end)
    on conflict(listing_id) do update set enabled = excluded.enabled, vacancy_message = excluded.vacancy_message,
      availability_version = excluded.availability_version, updated_at = now(),
      message_confirmed_on = case when p_message_confirmed then excluded.message_confirmed_on when settings.vacancy_message is distinct from excluded.vacancy_message then null else settings.message_confirmed_on end,
      message_valid_until = case when p_message_confirmed then excluded.message_valid_until when settings.vacancy_message is distinct from excluded.vacancy_message then null else settings.message_valid_until end;
  insert into public.cares_availability_operations(listing_id,operation_id,payload,result) values(p_listing,p_operation_id,payload,result);
  return result;
end $$;
revoke all on function public.cares_intake_save_availability(uuid,uuid,boolean,text,text,integer,uuid,boolean,date,boolean) from public, anon, authenticated;
grant execute on function public.cares_intake_save_availability(uuid,uuid,boolean,text,text,integer,uuid,boolean,date,boolean) to service_role;
commit;
