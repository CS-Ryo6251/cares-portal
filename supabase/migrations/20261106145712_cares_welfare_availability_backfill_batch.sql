-- Bounded, resumable import of public WAM identities only. No vacancy, claim or delivery writes.
create function public.cares_backfill_welfare_availability(p_snapshot uuid,p_version text,p_after uuid default null,p_limit integer default 500)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare batch uuid[]; entry uuid; n integer; matched integer; cursor_id uuid;
begin
 if p_limit is null or p_limit not between 1 and 1000 then raise exception 'invalid batch limit'; end if;
 perform pg_advisory_xact_lock(hashtextextended('service-availability-identity',0));
 perform 1 from public.welfare_directory_snapshots where id=p_snapshot and source='wam_disability' and state='active' and version=p_version for share;
 if not found or (select count(*) from public.welfare_directory_snapshots where source='wam_disability' and state='active')<>1 then raise exception 'active snapshot changed'; end if;
 select array_agg(id order by id),count(*)::int,max(id::text)::uuid into batch,n,cursor_id from (
  select id from public.welfare_directory_entries where snapshot_id=p_snapshot and searchable and (p_after is null or id>p_after) order by id limit p_limit
 ) e;
 if n=0 then return jsonb_build_object('processed',0,'cursor',p_after); end if;
 -- Existing verified ownership requires the same careful identity resolver as interactive writes.
 for entry in select e.id from public.welfare_directory_entries e where e.id=any(batch) and (
  exists(select 1 from public.facility_directory_links d where d.directory_entry_id=e.id)
  or exists(select 1 from public.cares_listings l where l.source_kind='welfare' and l.source_entry_id=e.id and l.is_owner_verified)
  or exists(select 1 from public.service_availability_target_aliases a join public.service_availability_targets t on t.id=a.target_id where a.source_kind='welfare' and a.source_entry_id=e.id and t.facility_id is not null)
 ) loop perform public.ensure_service_availability_target('welfare',entry); end loop;
 if exists(select 1 from public.cares_listings l join public.welfare_directory_entries e on e.id=l.source_entry_id
   where e.id=any(batch) and l.source_kind='welfare' and (l.service_type is distinct from e.service_type or l.source_version is distinct from p_version)) then raise exception 'source/service/version conflict'; end if;
 insert into public.cares_listings(facility_name,service_type,address,prefecture,city,phone,fax,corporation_name,source,source_kind,source_entry_id,source_version,public_provider_number,data_source_url)
 select e.name,e.service_type,e.address,e.prefecture,e.city,e.phone,e.fax,e.corporation_name,'government_import','welfare',e.id,p_version,e.number,'https://www.wam.go.jp/content/wamnet/pcpub/top/sfkopendata/'
 from public.welfare_directory_entries e where e.id=any(batch)
 and not exists(select 1 from public.service_availability_target_aliases a where a.source_kind='welfare' and a.source_entry_id=e.id)
 on conflict(source_kind,source_entry_id) where source_entry_id is not null do nothing;
 insert into public.service_availability_targets(source_kind,source_entry_id,service_type,listing_id)
 select 'welfare',e.id,e.service_type,l.id from public.welfare_directory_entries e
 join public.cares_listings l on l.source_kind='welfare' and l.source_entry_id=e.id
 where e.id=any(batch)
 and not exists(select 1 from public.service_availability_target_aliases a where a.source_kind='welfare' and a.source_entry_id=e.id)
 and not exists(select 1 from public.service_availability_targets t where t.listing_id=l.id)
 on conflict(source_kind,source_entry_id) do nothing;
 insert into public.service_availability_target_aliases(source_kind,source_entry_id,target_id)
 select 'welfare',e.id,t.id from public.welfare_directory_entries e
 join public.cares_listings l on l.source_kind='welfare' and l.source_entry_id=e.id
 join public.service_availability_targets t on t.listing_id=l.id
 where e.id=any(batch) on conflict(source_kind,source_entry_id) do nothing;
 insert into public.service_availability_target_aliases(source_kind,source_entry_id,target_id)
 select 'cares',t.listing_id,t.id from public.service_availability_target_aliases a
 join public.service_availability_targets t on t.id=a.target_id
 where a.source_kind='welfare' and a.source_entry_id=any(batch) and t.listing_id is not null
 on conflict(source_kind,source_entry_id) do nothing;
 select count(*)::int into matched from public.welfare_directory_entries e
 join public.service_availability_target_aliases a on a.source_kind='welfare' and a.source_entry_id=e.id
 join public.service_availability_targets t on t.id=a.target_id and t.service_type=e.service_type
 join public.cares_listings l on l.id=t.listing_id and l.service_type=e.service_type
 join public.service_availability_target_aliases ca on ca.source_kind='cares' and ca.source_entry_id=l.id and ca.target_id=t.id
 where e.id=any(batch);
 if matched<>n then raise exception 'post-write identity verification failed'; end if;
 return jsonb_build_object('processed',n,'cursor',cursor_id);
end $$;
revoke all on function public.cares_backfill_welfare_availability(uuid,text,uuid,integer) from public,anon,authenticated;
grant execute on function public.cares_backfill_welfare_availability(uuid,text,uuid,integer) to service_role;
