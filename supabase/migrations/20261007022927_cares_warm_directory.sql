begin;

-- Public counters are separate from private identities. Old stars are not converted.
create table public.cares_listing_heart_totals (
  listing_id uuid primary key references public.cares_listings(id) on delete cascade,
  total numeric not null default 0 check (total >= 0 and total = trunc(total)),
  supporters numeric not null default 0 check (supporters >= 0 and supporters = trunc(supporters))
);
create table public.cares_listing_heart_supporters (
  listing_id uuid not null references public.cares_listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_sent_at timestamptz not null default now(),
  primary key (listing_id, user_id)
);
create table public.cares_listing_heart_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  listing_id uuid not null references public.cares_listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);
alter table public.cares_listing_heart_totals enable row level security;
alter table public.cares_listing_heart_supporters enable row level security;
alter table public.cares_listing_heart_requests enable row level security;
revoke all on public.cares_listing_heart_totals, public.cares_listing_heart_supporters, public.cares_listing_heart_requests from public, anon, authenticated;
grant select on public.cares_listing_heart_totals to anon, authenticated;
grant all on public.cares_listing_heart_totals, public.cares_listing_heart_supporters, public.cares_listing_heart_requests to service_role;
create policy heart_totals_read on public.cares_listing_heart_totals for select to anon, authenticated using (true);
create view public.cares_listing_heart_summary with (security_invoker = true) as
  select listing_id, total::text as total, supporters::text as supporters from public.cares_listing_heart_totals;
revoke all on public.cares_listing_heart_summary from public, anon, authenticated;
grant select on public.cares_listing_heart_summary to anon, authenticated, service_role;

create function public.cares_send_listing_heart(p_listing_id uuid, p_user_id uuid, p_request_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_previous uuid;
  v_last timestamptz;
  v_new_supporter boolean;
  v_result jsonb;
begin
  if p_user_id is null or p_request_id is null or p_listing_id is null then raise exception 'INVALID_HEART'; end if;
  -- Serialize all sends by this account, then the listing; retries cannot increment twice.
  perform pg_advisory_xact_lock(hashtextextended('cares-heart-user:' || p_user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('cares-heart-listing:' || p_listing_id::text, 0));
  if not exists (select 1 from public.cares_listings where id = p_listing_id) then raise exception 'LISTING_NOT_FOUND'; end if;
  select listing_id into v_previous from public.cares_listing_heart_requests where user_id = p_user_id and request_id = p_request_id;
  if found then
    if v_previous <> p_listing_id then raise exception 'REQUEST_CONFLICT'; end if;
  else
    select max(last_sent_at) into v_last from public.cares_listing_heart_supporters where user_id = p_user_id;
    if v_last > clock_timestamp() - interval '1 second' then raise exception 'HEART_TOO_FAST'; end if;
    v_new_supporter := not exists (select 1 from public.cares_listing_heart_supporters where listing_id = p_listing_id and user_id = p_user_id);
    insert into public.cares_listing_heart_supporters(listing_id,user_id,last_sent_at)
      values(p_listing_id,p_user_id,clock_timestamp())
      on conflict (listing_id,user_id) do update set last_sent_at = excluded.last_sent_at;
    insert into public.cares_listing_heart_requests(user_id,request_id,listing_id) values(p_user_id,p_request_id,p_listing_id);
    insert into public.cares_listing_heart_totals(listing_id,total,supporters) values(p_listing_id,1,1)
      on conflict(listing_id) do update set total = cares_listing_heart_totals.total + 1,
      supporters = cares_listing_heart_totals.supporters + case when v_new_supporter then 1 else 0 end;
  end if;
  select jsonb_build_object('total',total::text,'supporters',supporters::text) into v_result
    from public.cares_listing_heart_totals where listing_id = p_listing_id;
  return v_result;
end;
$$;
revoke all on function public.cares_send_listing_heart(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.cares_send_listing_heart(uuid,uuid,uuid) to service_role;
create index cares_heart_supporter_user on public.cares_listing_heart_supporters(user_id, last_sent_at desc);

alter table public.cares_vacancy_reports
  add column information_source text check (information_source in ('facility_fax','facility_phone','facility_email','facility_website','visit','other')),
  add column confirmed_on date,
  add column valid_until date,
  add column user_id uuid references auth.users(id) on delete set null,
  add constraint cares_vacancy_dates check (confirmed_on is null or (valid_until >= confirmed_on and valid_until <= confirmed_on + 30));
create index cares_vacancy_confirmed on public.cares_vacancy_reports(listing_id,confirmed_on desc,reported_at desc);
create view public.cares_latest_vacancies with (security_invoker = true) as
  select distinct on (listing_id) listing_id, vacancy_type, information_source, confirmed_on, valid_until, reported_at, comment
  from public.cares_vacancy_reports
  order by listing_id, confirmed_on desc nulls last, reported_at desc;
revoke all on public.cares_latest_vacancies from public, anon, authenticated;
grant select on public.cares_latest_vacancies to anon, authenticated, service_role;
create view public.cares_directory_listing with (security_invoker = true) as
  select l.*,
    case when v.confirmed_on <= (now() at time zone 'Asia/Tokyo')::date
      and v.valid_until >= (now() at time zone 'Asia/Tokyo')::date
      then v.vacancy_type else 'unknown' end as current_acceptance_status
  from public.cares_listings l left join public.cares_latest_vacancies v on v.listing_id = l.id;
revoke all on public.cares_directory_listing from public, anon, authenticated;
grant select on public.cares_directory_listing to anon, authenticated, service_role;
commit;
