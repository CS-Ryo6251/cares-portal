-- Generated OS contract fixture; run scripts/sync-availability-contract.cjs.
-- One provider/service state shared by OS and Cares. Internal writes are service-role only.
alter table public.cares_listings add column if not exists source_kind text;
alter table public.cares_listings add column if not exists source_entry_id uuid;
alter table public.cares_listings add column if not exists source_version text;
alter table public.cares_listings add column if not exists public_provider_number text;
create unique index if not exists cares_listings_source_entry on public.cares_listings(source_kind,source_entry_id) where source_entry_id is not null;
create table public.service_availability_targets (
 id uuid primary key default gen_random_uuid(), source_kind text not null check(source_kind in ('master','welfare','facility','cares')),
 source_entry_id uuid not null, service_type text not null, facility_id uuid references public.facilities(id), listing_id uuid references public.cares_listings(id),
 created_at timestamptz not null default now(), unique(source_kind,source_entry_id), unique(listing_id)
);
create table public.service_availability_current (
 target_id uuid primary key references public.service_availability_targets(id),version integer not null check(version>0),
 status text not null check(status in ('available','conditional','unavailable','unknown')),summary jsonb not null default '{}',
 checked_at timestamptz not null,valid_until date not null,publish_cares boolean not null default false,share_os boolean not null default false,
 actor_user_id uuid,evidence text not null check(evidence in ('provider_verified','fax_reply')),recruitment_post_id uuid references public.service_posts(id) on delete set null
);
create table public.service_availability_history (
 target_id uuid not null references public.service_availability_targets(id),version integer not null,operation_id uuid not null,
 payload jsonb not null,result jsonb not null,created_at timestamptz not null default now(),primary key(target_id,version),unique(target_id,operation_id)
);
-- This table contains only consented public data, or an empty tombstone. Never copy private notes.
create table public.service_availability_projection (
 target_id uuid primary key references public.service_availability_targets(id),listing_id uuid unique references public.cares_listings(id),facility_id uuid,
 service_type text not null,version integer not null,status text not null,summary jsonb not null,checked_at timestamptz,valid_until date,
 evidence text not null,recruitment_post_id uuid,recruitment_status text not null default 'paused',published boolean not null
);
create table public.service_availability_public_markers (
 target_id uuid primary key,listing_id uuid,facility_id uuid,service_type text not null,version integer not null
);
alter table public.service_availability_public_markers enable row level security;
revoke all on public.service_availability_public_markers from public,anon,authenticated;
grant all on public.service_availability_public_markers to service_role;
grant select on public.service_availability_public_markers to anon,authenticated;
create policy availability_markers_read on public.service_availability_public_markers for select to anon,authenticated using(true);
alter table public.service_availability_targets enable row level security;
alter table public.service_availability_current enable row level security;
alter table public.service_availability_history enable row level security;
alter table public.service_availability_projection enable row level security;
revoke all on public.service_availability_targets,public.service_availability_current,public.service_availability_history,public.service_availability_projection from public,anon,authenticated;
grant all on public.service_availability_targets,public.service_availability_current,public.service_availability_history,public.service_availability_projection to service_role;
grant select on public.service_availability_projection to anon,authenticated;
create policy availability_projection_read on public.service_availability_projection for select to anon,authenticated using(not published or valid_until >= (now() at time zone 'Asia/Tokyo')::date);
-- Editing keeps inactive formats in the private current row. Public consumers receive
-- only the selected format, and never an unconfirmed/expired detail draft.
create function public.service_availability_public_summary(s jsonb,service_name text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare metadata jsonb; result jsonb; detail jsonb; fmt text; fields text[]; components text[];
 today date:=(now() at time zone 'Asia/Tokyo')::date;
begin
 select coalesce(jsonb_object_agg(key,value),'{}') into metadata from jsonb_each(s)
 where key in ('managed','generalStatus','generalValidUntil','detailConfirmation');
 detail:=case when s->>'calendarEnabled'='false' then s->'detailConfirmation' else coalesce(s->'calendar',s->'detailConfirmation') end;
 if s->>'generalStatus' in ('unavailable','unknown') or detail is null
  or (detail->>'confirmedOn')::date>today or (detail->>'validUntil')::date<today
  or (detail->>'confirmedOn') is null or (detail->>'validUntil') is null then return metadata; end if;
 result:=s-array['weekly','dayMode','dayUnits','visitSlots','shortStaySlots','residentialSlots','multifunction','generalAvailability','calendarEnabled'];
 if s ? 'calendar' and s->>'calendarEnabled' is distinct from 'false' then
  fmt:=s->'calendar'->>'format';
  components:=case fmt when 'day' then array['day'] when 'visit' then array['visit'] when 'shortStay' then array['overnight']
   when 'residential' then array['room'] when 'consultation' then array['consultation'] when 'multifunction' then array['day','visit','overnight'] else array[]::text[] end;
  result:=jsonb_set(result,'{calendar,slots}',coalesce((select jsonb_agg(value) from jsonb_array_elements(s->'calendar'->'slots') where value->>'component'=any(components)),'[]'));
 else
  result:=result-'calendar';
  fmt:=s->>'format';
  if fmt is null or fmt='auto' then
   fmt:=case
    when service_name like '%小規模多機能%' then 'multifunction'
    when service_name like '短期入所%' then 'shortStay'
    when service_name in ('居宅介護（障害福祉）','重度訪問介護','同行援護','行動援護','居宅訪問型児童発達支援','保育所等訪問支援','自立生活援助','居宅療養管理指導') or service_name like '%訪問%' then 'visit'
    when service_name in ('生活介護','自立訓練（機能訓練）','自立訓練（生活訓練）','就労選択支援','就労移行支援','就労継続支援A型','就労継続支援B型','児童発達支援','放課後等デイサービス') or service_name like '%通所%' then 'day'
    when service_name in ('施設入所支援','共同生活援助（障害福祉）','宿泊型自立訓練','福祉型障害児入所施設','医療型障害児入所施設','療養介護') or service_name ~ '入居者生活介護|入所者生活介護|共同生活介護|老人ホーム|高齢者向け|介護老人福祉施設|介護老人保健施設|介護療養型医療施設|介護医療院' then 'residential'
    else 'general' end;
  end if;
  fields:=case fmt when 'day' then case when s->>'dayMode'='units' or (not(s ? 'dayMode') and jsonb_array_length(coalesce(s->'dayUnits','[]'))>0) then array['dayMode','dayUnits'] else array['weekly'] end
   when 'visit' then array['visitSlots'] when 'shortStay' then array['shortStaySlots'] when 'residential' then array['residentialSlots'] when 'multifunction' then array['multifunction'] else array['generalAvailability'] end;
  result:=result||coalesce((select jsonb_object_agg(key,value) from jsonb_each(s) where key=any(fields)),'{}');
 end if;
 return result;
end $$;
revoke all on function public.service_availability_public_summary(jsonb,text) from public;
grant execute on function public.service_availability_public_summary(jsonb,text) to anon,authenticated,service_role;
-- The view has explicit consent/expiry predicates. Raw projection is not a public API.
revoke select on public.service_availability_projection from anon,authenticated;
create view public.service_availability_public with (security_barrier=true) as
 select m.target_id,m.listing_id,m.facility_id,m.service_type,m.version,
 case when published and valid_until >= (now() at time zone 'Asia/Tokyo')::date then status else 'unknown' end as status,
 case when published and valid_until >= (now() at time zone 'Asia/Tokyo')::date then public.service_availability_public_summary(summary,m.service_type) else '{}'::jsonb end as summary,
 checked_at,valid_until,evidence,recruitment_post_id,
 case when published and valid_until >= (now() at time zone 'Asia/Tokyo')::date then recruitment_status else 'expired' end as recruitment_status,
 coalesce(published and valid_until >= (now() at time zone 'Asia/Tokyo')::date,false) as published
 from public.service_availability_public_markers m left join public.service_availability_projection p on p.target_id=m.target_id;
revoke all on public.service_availability_public from public;
grant select on public.service_availability_public to anon,authenticated,service_role;

-- Source aliases retain each official row/snapshot without multiplying the provider state.
create table public.service_availability_target_aliases (
 source_kind text not null check(source_kind in ('master','welfare','facility','cares')),
 source_entry_id uuid not null,target_id uuid not null references public.service_availability_targets(id),
 primary key(source_kind,source_entry_id)
);
create index service_availability_alias_target on public.service_availability_target_aliases(target_id);
alter table public.service_availability_target_aliases enable row level security;
revoke all on public.service_availability_target_aliases from public,anon,authenticated;
grant all on public.service_availability_target_aliases to service_role;

create function public.ensure_service_availability_target(p_source_kind text,p_source_entry_id uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare t public.service_availability_targets; l public.cares_listings; e record; f public.facilities;
 linked uuid; n integer; candidate_ids uuid[]; service_name text; directory_id uuid; resolved uuid;
begin
 if p_source_kind not in ('master','welfare','facility','cares') or p_source_entry_id is null then raise exception 'invalid target'; end if;
 -- Facility-first and directory-first requests must not create two roots concurrently.
 -- This lock protects only identity resolution; regular saves lock their existing target row.
 perform pg_advisory_xact_lock(hashtextextended('service-availability-identity',0));
 if p_source_kind='facility' then
  select * into f from public.facilities where id=p_source_entry_id and status='active';
  if f.id is null then raise exception 'facility not found'; end if;
  linked:=f.id;service_name:=f.service_type;
  select count(*) into n from public.cares_listings where owner_facility_id=f.id and is_owner_verified and service_type=f.service_type;
  if n>1 then raise exception 'ambiguous facility identity'; end if;
  if n=1 then
   select * into l from public.cares_listings where owner_facility_id=f.id and is_owner_verified and service_type=f.service_type;
   if l.source_kind='welfare' then
    select count(distinct w.id),min(w.id::text)::uuid into n,directory_id
     from public.facility_directory_links d join public.welfare_directory_entries w on w.id=d.directory_entry_id
     join public.welfare_directory_snapshots s on s.id=w.snapshot_id
     where d.facility_id=f.id and d.verification_status='verified' and d.retired_at is null
      and w.searchable and s.state='active' and w.service_type=f.service_type;
    if n=1 then return public.ensure_service_availability_target('welfare',directory_id); end if;
    if n>1 then raise exception 'ambiguous facility identity'; end if;
   end if;
   if l.source_kind in ('master','welfare') and l.source_entry_id is not null then
    return public.ensure_service_availability_target(l.source_kind,l.source_entry_id);
   end if;
   if l.jigyosho_number is not null and l.address is not null then
    select count(*),min(id::text)::uuid into n,directory_id from public.facility_master_data
      where jigyosho_number=l.jigyosho_number and service_type=l.service_type and address=l.address;
    if n=1 then return public.ensure_service_availability_target('master',directory_id); end if;
   end if;
  else
   select count(distinct w.id),min(w.id::text)::uuid into n,directory_id
    from public.facility_directory_links d join public.welfare_directory_entries w on w.id=d.directory_entry_id
    join public.welfare_directory_snapshots s on s.id=w.snapshot_id
    where d.facility_id=f.id and d.verification_status='verified' and d.retired_at is null
      and w.searchable and s.state='active' and w.service_type=f.service_type;
   if n=1 then return public.ensure_service_availability_target('welfare',directory_id); end if;
   if n>1 then raise exception 'ambiguous facility identity'; end if;
  end if;
 elsif p_source_kind='cares' then
  select * into l from public.cares_listings where id=p_source_entry_id;
  if l.id is null then raise exception 'listing not found'; end if;
  service_name:=l.service_type;
  linked:=case when l.is_owner_verified then l.owner_facility_id end;
 elsif p_source_kind='welfare' then
  select w.*,s.version as directory_version into e from public.welfare_directory_entries w join public.welfare_directory_snapshots s on s.id=w.snapshot_id
   where w.id=p_source_entry_id and w.searchable and s.state='active';
  if e.id is null then raise exception 'directory entry unavailable'; end if;
  service_name:=e.service_type;
  select count(distinct d.facility_id),min(d.facility_id::text)::uuid into n,linked
    from public.facility_directory_links d join public.facilities owner on owner.id=d.facility_id
    where d.directory_entry_id=e.id and d.verification_status='verified' and d.retired_at is null
      and owner.status='active' and owner.service_type=e.service_type;
  if n<>1 then linked:=null; end if;
  select * into l from public.cares_listings where source_kind='welfare' and source_entry_id=e.id;
  if l.is_owner_verified and l.owner_facility_id is not null then
   if n>1 or (linked is not null and linked<>l.owner_facility_id) then raise exception 'ambiguous facility identity'; end if;
   linked:=l.owner_facility_id;
  end if;
 else
  select * into e from public.facility_master_data where id=p_source_entry_id;
  if e.id is null then raise exception 'directory entry unavailable'; end if;
  service_name:=e.service_type;
  select * into l from public.cares_listings where source_kind='master' and source_entry_id=e.id;
  if l.id is null then
   select count(*) into n from public.cares_listings where jigyosho_number=e.jigyosho_number and service_type=e.service_type and address=e.address and source_kind is null;
   if n>1 then raise exception 'ambiguous listing identity'; end if;
   select * into l from public.cares_listings where jigyosho_number=e.jigyosho_number and service_type=e.service_type and address=e.address and source_kind is null;
   if l.id is not null then
    update public.cares_listings set source_kind='master',source_entry_id=e.id,source_version=e.data_version where id=l.id returning * into l;
   end if;
  end if;
  linked:=case when l.is_owner_verified then l.owner_facility_id end;
 end if;
 if service_name is null or service_name='' then raise exception 'service type unresolved'; end if;
 if l.id is not null and l.service_type<>service_name then raise exception 'service identity mismatch'; end if;
 if linked is not null and not exists(select 1 from public.facilities where id=linked and status='active' and service_type=service_name) then linked:=null; end if;
 if p_source_kind='welfare' and linked is not null and l.is_owner_verified and l.owner_facility_id is distinct from linked then raise exception 'ambiguous facility identity'; end if;
 select array_agg(distinct candidate.id) into candidate_ids from (
  select target_id as id from public.service_availability_target_aliases where source_kind=p_source_kind and source_entry_id=p_source_entry_id
  union select id from public.service_availability_targets where source_kind=p_source_kind and source_entry_id=p_source_entry_id
  union select id from public.service_availability_targets where listing_id=l.id
  union select id from public.service_availability_targets where facility_id=linked and service_type=service_name
  union select target_id as id from public.service_availability_target_aliases where source_kind='cares' and source_entry_id=l.id
 ) candidate;
 if coalesce(array_length(candidate_ids,1),0)>1 then raise exception 'ambiguous facility identity'; end if;
 if coalesce(array_length(candidate_ids,1),0)=1 then
  select * into t from public.service_availability_targets where id=candidate_ids[1] for update;
  if t.service_type<>service_name then raise exception 'service identity mismatch'; end if;
  if p_source_kind='facility' and t.listing_id is not null and l.id is null then raise exception 'public listing ownership unresolved'; end if;
 end if;
 -- Reuse the stable public page for a verified provider when a new WAM snapshot arrives.
 if l.id is null and t.listing_id is not null then select * into l from public.cares_listings where id=t.listing_id; end if;
 if l.id is null and p_source_kind in ('master','welfare') then
  if p_source_kind='welfare' then
   insert into public.cares_listings(facility_name,service_type,address,prefecture,city,phone,fax,corporation_name,source,source_kind,source_entry_id,source_version,public_provider_number,data_source_url)
    values(e.name,e.service_type,e.address,e.prefecture,e.city,e.phone,e.fax,e.corporation_name,'government_import','welfare',e.id,e.directory_version,e.number,'https://www.wam.go.jp/content/wamnet/pcpub/top/sfkopendata/') returning * into l;
  else
   insert into public.cares_listings(facility_name,service_type,address,prefecture,city,phone,fax,source,source_kind,source_entry_id,source_version,public_provider_number,data_source_url)
    values(e.facility_name,e.service_type,e.address,e.prefecture,e.city,e.phone_number,e.fax_number,'government_import','master',e.id,e.data_version,e.jigyosho_number,'https://www.mhlw.go.jp/stf/kaigo-kouhyou_opendata.html') returning * into l;
  end if;
 end if;
 if t.id is null then
  insert into public.service_availability_targets(source_kind,source_entry_id,service_type,facility_id,listing_id)
    values(p_source_kind,p_source_entry_id,service_name,linked,l.id) returning * into t;
 else
  if t.facility_id is not null and t.facility_id is distinct from linked then
   delete from public.service_availability_target_aliases where target_id=t.id and source_kind='facility';
  end if;
  update public.service_availability_targets set facility_id=linked,listing_id=coalesce(listing_id,l.id) where id=t.id returning * into t;
  update public.service_availability_projection set facility_id=t.facility_id,listing_id=t.listing_id where target_id=t.id;
  update public.service_availability_public_markers set facility_id=t.facility_id,listing_id=t.listing_id where target_id=t.id;
 end if;
 insert into public.service_availability_target_aliases values(p_source_kind,p_source_entry_id,t.id)
  on conflict(source_kind,source_entry_id) do update set target_id=excluded.target_id;
 if l.id is not null then
  insert into public.service_availability_target_aliases values('cares',l.id,t.id)
   on conflict(source_kind,source_entry_id) do update set target_id=excluded.target_id;
 end if;
 if linked is not null then
  insert into public.service_availability_target_aliases values('facility',linked,t.id)
   on conflict(source_kind,source_entry_id) do update set target_id=excluded.target_id;
 end if;
 return t.id;
end $$;

create function public.service_availability_save(
 p_target_id uuid,p_expected_version integer,p_operation_id uuid,p_status text,p_summary jsonb,p_publish_cares boolean,p_share_os boolean,
 p_valid_until date,p_actor_user_id uuid,p_evidence text,p_recruitment_post_id uuid default null,p_reopen boolean default false
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare t public.service_availability_targets; c public.service_availability_current; h public.service_availability_history;
 b jsonb; answer jsonb; clean jsonb; next_version integer; post_id uuid; post_status text; today date:=(now() at time zone 'Asia/Tokyo')::date;
begin
 select * into t from public.service_availability_targets where id=p_target_id for update;
 if t.id is null then raise exception 'target not found'; end if;
 if p_operation_id is null or p_expected_version is null or p_status is null or p_status not in ('available','conditional','unavailable','unknown')
  or p_evidence is null or p_evidence not in ('provider_verified','fax_reply') or p_publish_cares is null or p_share_os is null
  or p_summary is null or p_valid_until is null or p_valid_until<today or p_valid_until>today+30 or jsonb_typeof(p_summary)<>'object' or octet_length(p_summary::text)>64000 then raise exception 'invalid availability'; end if;
 if p_evidence='provider_verified' and (p_actor_user_id is null or not (
  exists(select 1 from public.user_profiles u join public.facilities f on f.organization_id=u.organization_id
   where u.user_id=p_actor_user_id and u.is_active and f.id=t.facility_id and f.status='active' and f.service_type=t.service_type and
    (u.role='admin' or exists(select 1 from public.user_facility_assignments a where a.user_id=u.id and a.facility_id=f.id)) and
    ((t.listing_id is null and t.source_kind='facility') or
     exists(select 1 from public.cares_listings l where l.id=t.listing_id and l.owner_facility_id=f.id and l.is_owner_verified and l.service_type=t.service_type) or
     exists(select 1 from public.facility_directory_links d join public.welfare_directory_entries w on w.id=d.directory_entry_id
      join public.welfare_directory_snapshots sn on sn.id=w.snapshot_id
      join public.service_availability_target_aliases a on a.source_kind='welfare' and a.source_entry_id=w.id
      where a.target_id=t.id and d.facility_id=f.id and d.verification_status='verified' and d.retired_at is null
       and w.service_type=t.service_type and w.searchable and sn.state='active')))
  or exists(select 1 from public.cares_owner_claims o join public.cares_listings l on l.id=o.listing_id
   where o.listing_id=t.listing_id and o.user_id=p_actor_user_id and o.status='approved' and o.reviewed_at is not null and o.reviewed_by is not null and l.is_owner_verified)
 )) then raise exception 'availability forbidden'; end if;
 if p_publish_cares and t.listing_id is null then raise exception 'public listing unresolved'; end if;
 -- Explicit allowlist shared with availabilitySummarySchema. Never persist case-specific fields here.
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into clean from jsonb_each(p_summary)
  where key=any(array['format','weekly','dayMode','dayUnits','visitSlots','shortStaySlots','residentialSlots','multifunction','generalAvailability','startTiming','transport','careLevels','accepts','consults','unavailable','calendar','calendarEnabled','detailConfirmation']);
 clean:=clean||jsonb_build_object('managed',true,'generalStatus',p_status,'generalValidUntil',p_valid_until);
 b:=jsonb_build_object('status',p_status,'summary',clean,'publish_cares',p_publish_cares,'share_os',p_share_os,'valid_until',p_valid_until,'actor_user_id',p_actor_user_id,'evidence',p_evidence,'recruitment_post_id',p_recruitment_post_id,'consent_version','availability-publication-v1','reopen',p_reopen);
 select * into h from public.service_availability_history where target_id=t.id and operation_id=p_operation_id;
 if h.target_id is not null then
  if h.payload<>b then raise exception 'idempotency conflict'; end if;
  return h.result;
 end if;
 select * into c from public.service_availability_current where target_id=t.id;
 if coalesce(c.version,0)<>p_expected_version then raise exception 'availability version conflict'; end if;
 next_version:=coalesce(c.version,0)+1;
 post_id:=coalesce(p_recruitment_post_id,c.recruitment_post_id);
 if post_id is not null then
  select status into post_status from public.service_posts where id=post_id and type='acceptUsers' and facility_id=t.facility_id;
  if not found then raise exception 'recruitment target mismatch'; end if;
  if post_status='active' and (p_status not in ('available','conditional') or not p_share_os or (c.valid_until<today and not p_reopen) or ((select coalesce((service_details->>'publishToCares')::boolean,false) from public.service_posts where id=post_id) and not p_publish_cares)) then post_status:='inactive'; end if;
  update public.service_posts set status=post_status,
   service_details=coalesce(service_details,'{}'::jsonb)||jsonb_build_object('availability',public.service_availability_public_summary(clean,t.service_type),'availabilityTargetId',t.id,'availabilityVersion',next_version,'publishToCares',p_publish_cares),updated_at=now()
   where id=post_id;
 end if;
 insert into public.service_availability_current values(t.id,next_version,p_status,clean,now(),p_valid_until,p_publish_cares,p_share_os,p_actor_user_id,p_evidence,post_id)
 on conflict(target_id) do update set version=excluded.version,status=excluded.status,summary=excluded.summary,checked_at=excluded.checked_at,valid_until=excluded.valid_until,
  publish_cares=excluded.publish_cares,share_os=excluded.share_os,actor_user_id=excluded.actor_user_id,evidence=excluded.evidence,recruitment_post_id=excluded.recruitment_post_id;
 insert into public.service_availability_projection values(t.id,t.listing_id,t.facility_id,t.service_type,next_version,
  case when p_publish_cares then p_status else 'unknown' end,case when p_publish_cares then public.service_availability_public_summary(clean,t.service_type) else '{}'::jsonb end,
  case when p_publish_cares then now() end,case when p_publish_cares then p_valid_until end,p_evidence,
  case when p_publish_cares then post_id end,case when p_publish_cares and post_status='active' then 'active' else 'paused' end,p_publish_cares)
 on conflict(target_id) do update set listing_id=excluded.listing_id,facility_id=excluded.facility_id,version=excluded.version,status=excluded.status,summary=excluded.summary,
  checked_at=excluded.checked_at,valid_until=excluded.valid_until,evidence=excluded.evidence,recruitment_post_id=excluded.recruitment_post_id,recruitment_status=excluded.recruitment_status,published=excluded.published;
 insert into public.service_availability_public_markers values(t.id,t.listing_id,t.facility_id,t.service_type,next_version)
 on conflict(target_id) do update set listing_id=excluded.listing_id,facility_id=excluded.facility_id,service_type=excluded.service_type,version=excluded.version;
 answer:=jsonb_build_object('target_id',t.id,'version',next_version,'status',p_status,'listing_id',t.listing_id,'published',p_publish_cares);
 insert into public.service_availability_history(target_id,version,operation_id,payload,result) values(t.id,next_version,p_operation_id,b,answer);
 return answer;
end $$;
revoke all on function public.ensure_service_availability_target(text,uuid) from public,anon,authenticated;
grant execute on function public.ensure_service_availability_target(text,uuid) to service_role;
revoke all on function public.service_availability_save(uuid,integer,uuid,text,jsonb,boolean,boolean,date,uuid,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.service_availability_save(uuid,integer,uuid,text,jsonb,boolean,boolean,date,uuid,text,uuid,boolean) to service_role;

create table public.service_availability_provider_operations (
 target_id uuid not null references public.service_availability_targets(id),operation_id uuid not null,payload jsonb not null,result jsonb not null,
 primary key(target_id,operation_id)
);
alter table public.service_availability_provider_operations enable row level security;
revoke all on public.service_availability_provider_operations from public,anon,authenticated;
grant all on public.service_availability_provider_operations to service_role;

-- Save-only and explicit recruitment use the same transaction. No notification or FAX is sent here.
create function public.service_availability_provider_update(
 p_facility_id uuid,p_actor_user_id uuid,p_expected_version integer,p_operation_id uuid,p_status text,p_summary jsonb,
 p_publish_cares boolean,p_share_os boolean,p_valid_until date,p_recruit boolean default false,p_title text default null,p_content text default null
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare target uuid; t public.service_availability_targets; c public.service_availability_current; f public.facilities;
 post_id uuid; result jsonb; count_posts integer; payload jsonb; previous public.service_availability_provider_operations;
begin
 select * into f from public.facilities where id=p_facility_id;
 if not exists(select 1 from public.user_profiles u where u.user_id=p_actor_user_id and u.organization_id=f.organization_id and u.is_active
  and (u.role='admin' or exists(select 1 from public.user_facility_assignments a where a.user_id=u.id and a.facility_id=f.id))) then raise exception 'availability forbidden'; end if;
 target:=public.ensure_service_availability_target('facility',p_facility_id);
 select * into t from public.service_availability_targets where id=target for update;
 select * into c from public.service_availability_current where target_id=target;
 post_id:=c.recruitment_post_id;
 payload:=jsonb_build_object('facility',p_facility_id,'actor',p_actor_user_id,'version',p_expected_version,'status',p_status,'summary',p_summary,'publish',p_publish_cares,'share',p_share_os,'until',p_valid_until,'recruit',p_recruit,'title',p_title,'content',p_content);
 select * into previous from public.service_availability_provider_operations where target_id=target and operation_id=p_operation_id;
 if previous.target_id is not null then
  if previous.payload<>payload then raise exception 'idempotency conflict'; end if;
  return previous.result;
 end if;
 -- An existing active recruitment follows a first save too; save-only never creates one.
 if post_id is null then
   select count(*) into count_posts from public.service_posts where facility_id=f.id and type='acceptUsers' and status='active';
   if count_posts>1 then raise exception 'multiple active recruitments'; end if;
   select id into post_id from public.service_posts where facility_id=f.id and type='acceptUsers' and status='active';
 end if;
 if p_recruit then
  if not p_share_os or p_status not in ('available','conditional') then raise exception 'recruitment requires available shared state'; end if;
  if post_id is null then
   insert into public.service_posts(organization_id,facility_id,user_id,type,category,title,content,service_types,target_area,status,service_details)
   values(f.organization_id,f.id,p_actor_user_id,'acceptUsers','acceptUsers',coalesce(nullif(p_title,''),f.name||'の利用相談'),
    coalesce(nullif(p_content,''),'現在の受入状況・条件をご確認のうえ、ご相談ください。'),array[f.service_type],f.address,'active',
    jsonb_build_object('facilityTypes',array[f.service_type],'area',f.address,'visibility','public','publishToCares',p_publish_cares,'allowChatInvitations',true)) returning id into post_id;
  else
   update public.service_posts set status='active',title=coalesce(nullif(p_title,''),f.name||'の利用相談'),
    content=coalesce(nullif(p_content,''),'現在の受入状況・条件をご確認のうえ、ご相談ください。'),
    service_types=array[f.service_type],target_area=f.address,
    service_details=jsonb_build_object('facilityTypes',array[f.service_type],'area',f.address,'visibility','public','allowChatInvitations',true,'publishToCares',p_publish_cares)
    where id=post_id;
  end if;
 end if;
 result:=public.service_availability_save(target,p_expected_version,p_operation_id,p_status,p_summary,p_publish_cares,p_share_os,p_valid_until,p_actor_user_id,'provider_verified',post_id,p_recruit);
 result:=result||jsonb_build_object('recruitment_post_id',post_id);
 insert into public.service_availability_provider_operations values(target,p_operation_id,payload,result);
 return result;
end $$;
revoke all on function public.service_availability_provider_update(uuid,uuid,integer,uuid,text,jsonb,boolean,boolean,date,boolean,text,text) from public,anon,authenticated;
grant execute on function public.service_availability_provider_update(uuid,uuid,integer,uuid,text,jsonb,boolean,boolean,date,boolean,text,text) to service_role;

create function public.service_availability_recruitment_status() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 update public.service_availability_projection set recruitment_status=case when new.status='active' and published and status in ('available','conditional') then 'active' else 'paused' end where recruitment_post_id=new.id;
 return new;
end $$;
create trigger service_availability_recruitment_status after update of status on public.service_posts for each row when (new.type='acceptUsers') execute function public.service_availability_recruitment_status();
revoke all on function public.service_availability_recruitment_status() from public,anon,authenticated;
grant execute on function public.service_availability_recruitment_status() to service_role;

create function public.service_availability_set_recruitment_status(p_post uuid,p_actor uuid,p_status text,p_expected_version integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.service_posts; c public.service_availability_current; target uuid;
begin
 select target_id into target from public.service_availability_current where recruitment_post_id=p_post;
 if target is not null then perform 1 from public.service_availability_targets where id=target for update; end if;
 select * into p from public.service_posts where id=p_post and type='acceptUsers' for update;
 if p.id is null or not exists(select 1 from public.user_profiles u where u.user_id=p_actor and u.organization_id=p.organization_id and u.is_active and
  (u.role='admin' or exists(select 1 from public.user_facility_assignments a where a.user_id=u.id and a.facility_id=p.facility_id))) then raise exception 'recruitment forbidden'; end if;
 if p_status is null or p_status not in ('active','inactive','closed') then raise exception 'invalid recruitment status'; end if;
 select * into c from public.service_availability_current where recruitment_post_id=p.id;
 if c.target_id is not null and c.version is distinct from p_expected_version then raise exception 'availability version conflict'; end if;
 if p_status='active' and (c.target_id is null or not c.share_os or c.status not in ('available','conditional') or c.valid_until<(now() at time zone 'Asia/Tokyo')::date) then raise exception 'update availability first'; end if;
 update public.service_posts set status=p_status,updated_at=now() where id=p.id returning * into p;
 return to_jsonb(p);
end $$;
revoke all on function public.service_availability_set_recruitment_status(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.service_availability_set_recruitment_status(uuid,uuid,text,integer) to service_role;
