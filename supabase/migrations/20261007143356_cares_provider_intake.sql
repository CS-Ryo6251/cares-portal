-- Private application data. Only the server can access these tables/functions.
-- Claims are submitted through the existing server route, never directly by a client.
drop policy if exists cares_claims_public_insert on public.cares_owner_claims;
revoke insert, update, delete on public.cares_owner_claims from anon, authenticated;

create table public.cares_intake_settings (
  listing_id uuid primary key references public.cares_listings(id) on delete cascade,
  enabled boolean not null default true,
  vacancy_message text not null default '' check (length(vacancy_message) <= 1000),
  updated_at timestamptz not null default now()
);
create table public.cares_intake_drafts (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.cares_listings(id),
  secret_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create table public.cares_intake_files (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.cares_intake_drafts(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  size_bytes integer not null check (size_bytes between 1 and 3145728),
  ready boolean not null default false,
  deleting boolean not null default false,
  created_at timestamptz not null default now()
);
create index cares_intake_files_draft_idx on public.cares_intake_files(draft_id);
create table public.cares_applications (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null unique references public.cares_intake_drafts(id),
  listing_id uuid not null references public.cares_listings(id),
  fields jsonb not null check (jsonb_typeof(fields) = 'object' and octet_length(fields::text) <= 16000),
  status text not null default 'new' check (status in ('new','reviewing','contacted','scheduled','closed')),
  consent_version text not null default '2026-10-07',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);
create index cares_applications_listing_created_idx on public.cares_applications(listing_id, created_at desc);
create index cares_intake_drafts_expiry_idx on public.cares_intake_drafts(expires_at);
create table public.cares_intake_limits (
  key text primary key,
  count integer not null,
  expires_at timestamptz not null
);

alter table public.cares_intake_settings enable row level security;
alter table public.cares_intake_drafts enable row level security;
alter table public.cares_intake_files enable row level security;
alter table public.cares_applications enable row level security;
alter table public.cares_intake_limits enable row level security;
revoke all on public.cares_intake_settings, public.cares_intake_drafts, public.cares_intake_files, public.cares_applications, public.cares_intake_limits from public, anon, authenticated;
grant all on public.cares_intake_settings, public.cares_intake_drafts, public.cares_intake_files, public.cares_applications, public.cares_intake_limits to service_role;

create function public.cares_intake_recipients(p_listing uuid)
returns table(user_id uuid) language sql stable security invoker set search_path = '' as $$
  select c.user_id from public.cares_owner_claims c
  join public.cares_listings l on l.id = c.listing_id
  where l.id = p_listing and l.is_owner_verified = true
    and c.status = 'approved' and c.reviewed_at is not null and c.reviewed_by is not null and c.user_id is not null
  union
  select p.user_id from public.cares_listings l
  join public.facilities f on f.id = l.owner_facility_id
  join public.user_facility_assignments a on a.facility_id = f.id
  join public.user_profiles p on p.id = a.user_id and p.organization_id = f.organization_id
  where l.id = p_listing and l.is_owner_verified = true
    and p.is_active = true and p.role in ('admin','manager') and p.user_id is not null
$$;

create function public.cares_intake_owned_listings(p_user uuid)
returns table(id uuid, facility_name text, service_type text) language sql stable security invoker set search_path = '' as $$
  select l.id, l.facility_name, l.service_type from public.cares_listings l
  where l.is_owner_verified = true and exists (
    select 1 from public.cares_intake_recipients(l.id) r where r.user_id = p_user
  ) order by l.facility_name
$$;

create function public.cares_intake_take_limit(p_key text, p_limit integer, p_seconds integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
  insert into public.cares_intake_limits as l(key, count, expires_at)
  values(p_key, 1, now() + make_interval(secs => p_seconds))
  on conflict(key) do update set
    count = case when l.expires_at <= now() then 1 else l.count + 1 end,
    expires_at = case when l.expires_at <= now() then excluded.expires_at else l.expires_at end
  returning count into n;
  return n <= p_limit;
end $$;

create function public.cares_intake_reserve_file(p_draft uuid, p_hash text, p_id uuid, p_mime text, p_size integer)
returns text language plpgsql security invoker set search_path = '' as $$
declare d public.cares_intake_drafts; path text;
begin
  select * into d from public.cares_intake_drafts where id = p_draft for update;
  if d.id is null or d.secret_hash <> p_hash or d.expires_at <= now()
    or exists(select 1 from public.cares_applications where draft_id = d.id) then raise exception 'draft unavailable'; end if;
  if (select count(*) from public.cares_intake_files where draft_id = d.id) >= 3 then raise exception 'file limit'; end if;
  path := d.id::text || '/' || p_id::text;
  insert into public.cares_intake_files(id, draft_id, storage_path, mime_type, size_bytes)
  values(p_id, d.id, path, p_mime, p_size);
  return path;
end $$;

create function public.cares_intake_submit(p_draft uuid, p_hash text, p_fields jsonb, p_file_ids uuid[] default array[]::uuid[])
returns uuid language plpgsql security invoker set search_path = '' as $$
declare d public.cares_intake_drafts; result uuid; receivers uuid[];
begin
  select * into d from public.cares_intake_drafts where id = p_draft for update;
  if d.id is null or d.secret_hash <> p_hash then raise exception 'draft unavailable'; end if;
  -- A lost HTTP response can be retried without sending another application/notification.
  select id into result from public.cares_applications where draft_id = d.id;
  if result is not null then return result; end if;
  if d.expires_at <= now() then raise exception 'draft expired'; end if;
  if exists(select 1 from public.cares_intake_files where draft_id = d.id and not ready) then raise exception 'upload incomplete'; end if;
  if (select coalesce(array_agg(id order by id), array[]::uuid[]) from public.cares_intake_files where draft_id = d.id) <> (select coalesce(array_agg(x order by x), array[]::uuid[]) from unnest(p_file_ids) x) then raise exception 'attachments changed'; end if;
  if exists(select 1 from public.cares_intake_settings where listing_id = d.listing_id and not enabled) then raise exception 'intake paused'; end if;
  select array_agg(user_id) into receivers from public.cares_intake_recipients(d.listing_id);
  if coalesce(array_length(receivers, 1), 0) = 0 then raise exception 'no recipient'; end if;
  insert into public.cares_applications(draft_id, listing_id, fields) values(d.id, d.listing_id, p_fields) returning id into result;
  insert into public.cares_notifications(user_id, type, title, body, resource_type, resource_id)
    select u, 'system', '利用・体験のお申込みが届きました', '申込み受付で内容を確認し、申込者にご連絡ください。', 'application', result
    from unnest(receivers) u;
  return result;
end $$;

create function public.cares_intake_detach_file(p_draft uuid, p_hash text, p_file uuid)
returns text language plpgsql security invoker set search_path = '' as $$
declare d public.cares_intake_drafts; path text;
begin
  select * into d from public.cares_intake_drafts where id = p_draft for update;
  if d.id is null or d.secret_hash <> p_hash or d.expires_at <= now()
    or exists(select 1 from public.cares_applications where draft_id = d.id) then raise exception 'draft unavailable'; end if;
  update public.cares_intake_files set ready = false, deleting = true
    where id = p_file and draft_id = d.id and (ready or deleting) returning storage_path into path;
  if path is null then raise exception 'file unavailable'; end if;
  return path;
end $$;

create function public.cares_intake_update_settings(p_user uuid, p_listing uuid, p_enabled boolean, p_message text, p_status text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not exists(select 1 from public.cares_intake_recipients(p_listing) where user_id = p_user) then raise exception 'forbidden'; end if;
  if p_status not in ('has_vacancy','no_vacancy','unknown') then raise exception 'invalid status'; end if;
  insert into public.cares_intake_settings(listing_id, enabled, vacancy_message) values(p_listing, p_enabled, p_message)
    on conflict(listing_id) do update set enabled = excluded.enabled, vacancy_message = excluded.vacancy_message, updated_at = now();
  update public.cares_listings set acceptance_status = case p_status when 'has_vacancy' then 'accepting' when 'no_vacancy' then 'not_accepting' else 'unknown' end, updated_at = now() where id = p_listing;
  -- The same status is used by OS posts. A later OS post can update it as usual.
  update public.facility_portal_profiles set acceptance_status = p_status, updated_at = now()
    where facility_id = (select owner_facility_id from public.cares_listings where id = p_listing);
end $$;

revoke all on function public.cares_intake_recipients(uuid), public.cares_intake_owned_listings(uuid), public.cares_intake_take_limit(text,integer,integer), public.cares_intake_reserve_file(uuid,text,uuid,text,integer), public.cares_intake_submit(uuid,text,jsonb,uuid[]), public.cares_intake_detach_file(uuid,text,uuid), public.cares_intake_update_settings(uuid,uuid,boolean,text,text) from public, anon, authenticated;
grant execute on function public.cares_intake_recipients(uuid), public.cares_intake_owned_listings(uuid), public.cares_intake_take_limit(text,integer,integer), public.cares_intake_reserve_file(uuid,text,uuid,text,integer), public.cares_intake_submit(uuid,text,jsonb,uuid[]), public.cares_intake_detach_file(uuid,text,uuid), public.cares_intake_update_settings(uuid,uuid,boolean,text,text) to service_role;

create function public.cares_intake_cleanup_candidates()
returns table(id uuid) language sql stable security invoker set search_path = '' as $$
  select d.id from public.cares_intake_drafts d left join public.cares_applications a on a.draft_id = d.id
  where (a.id is null and d.expires_at < now()) or a.created_at < now() - interval '180 days'
  order by d.created_at limit 100
$$;
create function public.cares_intake_cleanup_finish(p_draft uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.cares_intake_drafts where id = p_draft and expires_at < now() for update;
  if not found or exists(select 1 from public.cares_applications where draft_id = p_draft and created_at >= now() - interval '180 days') then raise exception 'not expired'; end if;
  delete from public.cares_notifications where resource_type = 'application' and resource_id in (select id from public.cares_applications where draft_id = p_draft);
  delete from public.cares_applications where draft_id = p_draft;
  delete from public.cares_intake_drafts where id = p_draft;
end $$;
revoke all on function public.cares_intake_cleanup_candidates(), public.cares_intake_cleanup_finish(uuid) from public, anon, authenticated;
grant execute on function public.cares_intake_cleanup_candidates(), public.cares_intake_cleanup_finish(uuid) to service_role;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('cares-applications', 'cares-applications', false, 3145728, array['image/jpeg','image/png','image/webp','application/pdf']);
-- Deliberately no storage.objects policy: download/upload only through authorized server routes.
