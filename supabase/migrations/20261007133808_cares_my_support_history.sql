begin;

-- Guest hearts stay anonymous. Only future, verified signed-in sends are linked.
alter table public.cares_guest_heart_requests add column user_id uuid references auth.users(id) on delete set null;
create index cares_guest_hearts_user_date on public.cares_guest_heart_requests(user_id, created_at desc) where user_id is not null;
create index cares_member_hearts_user_date on public.cares_listing_heart_requests(user_id, created_at desc);
grant select (request_id, listing_id, user_id, created_at) on public.cares_guest_heart_requests to authenticated;
grant select on public.cares_listing_heart_requests to authenticated;
create policy my_guest_hearts_read on public.cares_guest_heart_requests for select to authenticated using ((select auth.uid()) = user_id);
create policy my_member_hearts_read on public.cares_listing_heart_requests for select to authenticated using ((select auth.uid()) = user_id);

-- The API verifies the user with Auth. This function is service-role only.
-- Existing guest sends are never adopted on shared devices, even on a retry.
create function public.cares_send_support_heart(p_listing_id uuid, p_request_id uuid, p_visitor_hash text, p_network_hash text, p_user_id uuid default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_exists boolean; v_user uuid; v_result jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('cares-guest-request:' || p_request_id::text, 0));
  select user_id into v_user from public.cares_guest_heart_requests where request_id = p_request_id;
  v_exists := found;
  if v_exists and v_user is not null and v_user is distinct from p_user_id then raise exception 'REQUEST_OWNER_CHANGED'; end if;
  v_result := public.cares_send_guest_heart(p_listing_id, p_request_id, p_visitor_hash, p_network_hash);
  if not v_exists and p_user_id is not null then
    update public.cares_guest_heart_requests set user_id = p_user_id where request_id = p_request_id;
    v_user := p_user_id;
  end if;
  return v_result || jsonb_build_object('recorded', coalesce(p_user_id is not null and v_user = p_user_id, false));
end;
$$;
revoke all on function public.cares_send_support_heart(uuid,uuid,text,text,uuid) from public, anon, authenticated;
grant execute on function public.cares_send_support_heart(uuid,uuid,text,text,uuid) to service_role;

-- No caller-supplied user ID, no definer privileges, no public activity feed.
create function public.cares_my_support(p_period text default '30d')
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_user uuid := auth.uid(); v_now timestamptz := now(); v_from timestamptz; v_result jsonb;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_period is null or p_period not in ('30d','90d','all') then raise exception 'INVALID_PERIOD'; end if;
  v_from := case when p_period = 'all' then null else
    ((v_now at time zone 'Asia/Tokyo')::date - case when p_period = '30d' then 29 else 89 end)::timestamp at time zone 'Asia/Tokyo' end;
  with all_events as materialized (
    select 'guest:' || request_id::text as id, listing_id, created_at from public.cares_guest_heart_requests where user_id = v_user and created_at <= v_now
    union all
    select 'member:' || request_id::text, listing_id, created_at from public.cares_listing_heart_requests where user_id = v_user and created_at <= v_now
  ), events as materialized (
    select * from all_events where v_from is null or created_at >= v_from
  ), grouped as (
    select listing_id, count(*) as amount, max(created_at) as last_sent_at from events group by listing_id
  ), buckets as (
    select generate_series(
      case when p_period = 'all' then date_trunc('month', coalesce((select min(created_at) from all_events), v_now) at time zone 'Asia/Tokyo') else v_from at time zone 'Asia/Tokyo' end,
      case when p_period = 'all' then date_trunc('month', v_now at time zone 'Asia/Tokyo') else (v_now at time zone 'Asia/Tokyo')::date::timestamp end,
      case when p_period = 'all' then interval '1 month' else interval '1 day' end
    ) as day
  ), daily as (
    select date_trunc(case when p_period = 'all' then 'month' else 'day' end, created_at at time zone 'Asia/Tokyo') as day, count(*) as amount from events group by 1
  )
  select jsonb_build_object(
    'period', p_period, 'from', v_from, 'asOf', v_now, 'unit', case when p_period = 'all' then 'month' else 'day' end,
    'total', (select count(*)::text from events), 'lifetimeTotal', (select count(*)::text from all_events),
    'facilityCount', (select count(*) from grouped),
    'activeDays', (select count(distinct (created_at at time zone 'Asia/Tokyo')::date) from events),
    'timeline', (select coalesce(jsonb_agg(jsonb_build_object('date', to_char(b.day,'YYYY-MM-DD'), 'count', coalesce(d.amount,0)::text) order by b.day), '[]'::jsonb) from buckets b left join daily d using(day)),
    'facilities', (select coalesce(jsonb_agg(jsonb_build_object('id', g.listing_id, 'name', coalesce(l.facility_name,'掲載情報を確認できない事業所'), 'serviceType', l.service_type, 'address', l.address, 'count', g.amount::text, 'lastSentAt', g.last_sent_at) order by g.amount desc, g.last_sent_at desc, g.listing_id), '[]'::jsonb) from grouped g left join public.cares_listings l on l.id = g.listing_id),
    'recent', (select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'listingId', e.listing_id, 'name', coalesce(l.facility_name,'掲載情報を確認できない事業所'), 'at', e.created_at) order by e.created_at desc, e.id desc), '[]'::jsonb) from (select * from events order by created_at desc, id desc limit 20) e left join public.cares_listings l on l.id = e.listing_id)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.cares_my_support(text) from public, anon, authenticated;
grant execute on function public.cares_my_support(text) to authenticated;
commit;
