begin;
-- Request IDs survive a lost response even before the visitor cookie is saved.
-- No account, raw IP address or public identity is stored here.
create table public.cares_guest_heart_requests (
  request_id uuid primary key,
  listing_id uuid not null references public.cares_listings(id) on delete cascade,
  visitor_hash text not null check (visitor_hash ~ '^[a-f0-9]{64}$'),
  network_hash text not null check (network_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default clock_timestamp()
);
create index cares_guest_hearts_visitor on public.cares_guest_heart_requests(visitor_hash,created_at desc);
create index cares_guest_hearts_network on public.cares_guest_heart_requests(network_hash,created_at desc);
create index cares_guest_hearts_listing on public.cares_guest_heart_requests(listing_id);
alter table public.cares_guest_heart_requests enable row level security;
revoke all on public.cares_guest_heart_requests from public, anon, authenticated;
grant all on public.cares_guest_heart_requests to service_role;

create function public.cares_send_guest_heart(p_listing_id uuid,p_request_id uuid,p_visitor_hash text,p_network_hash text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_previous uuid;
  v_total numeric;
begin
  if p_listing_id is null or p_request_id is null or p_visitor_hash is null or p_network_hash is null
    or p_visitor_hash !~ '^[a-f0-9]{64}$' or p_network_hash !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_HEART'; end if;
  perform pg_advisory_xact_lock(hashtextextended('cares-guest-request:' || p_request_id::text,0));
  select listing_id into v_previous from public.cares_guest_heart_requests where request_id=p_request_id;
  if found then
    if v_previous <> p_listing_id then raise exception 'REQUEST_CONFLICT'; end if;
    select total into v_total from public.cares_listing_heart_totals where listing_id=p_listing_id;
    return jsonb_build_object('total',v_total::text);
  end if;
  perform pg_advisory_xact_lock(hashtextextended('cares-guest-visitor:' || p_visitor_hash,0));
  perform pg_advisory_xact_lock(hashtextextended('cares-guest-network:' || p_network_hash,0));
  if not exists(select 1 from public.cares_listings where id=p_listing_id) then raise exception 'LISTING_NOT_FOUND'; end if;
  if exists(select 1 from public.cares_guest_heart_requests where visitor_hash=p_visitor_hash and created_at>clock_timestamp()-interval '1 second')
    or (select count(*) from public.cares_guest_heart_requests where network_hash=p_network_hash and created_at>clock_timestamp()-interval '1 minute')>=120
    then raise exception 'HEART_TOO_FAST'; end if;
  -- Share the listing lock with the previous authenticated heart function.
  perform pg_advisory_xact_lock(hashtextextended('cares-heart-listing:' || p_listing_id::text,0));
  insert into public.cares_guest_heart_requests(request_id,listing_id,visitor_hash,network_hash)
    values(p_request_id,p_listing_id,p_visitor_hash,p_network_hash);
  insert into public.cares_listing_heart_totals(listing_id,total,supporters) values(p_listing_id,1,0)
    on conflict(listing_id) do update set total=cares_listing_heart_totals.total+1
    returning total into v_total;
  return jsonb_build_object('total',v_total::text);
end;
$$;
revoke all on function public.cares_send_guest_heart(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.cares_send_guest_heart(uuid,uuid,text,text) to service_role;
commit;
