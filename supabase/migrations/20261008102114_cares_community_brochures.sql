begin;
create table public.cares_brochures (
 id uuid primary key,
 listing_id uuid not null references public.cares_listings(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(char_length(title) between 1 and 100),
 note text not null default '' check(char_length(note)<=300),
 issued_month text check(issued_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
 files jsonb not null check(jsonb_typeof(files)='array' and jsonb_array_length(files) between 1 and 3),
 request_hash text not null,
 status text not null default 'uploading' check(status in ('uploading','published','hidden','deleted')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index cares_brochures_listing_date on public.cares_brochures(listing_id,created_at desc,id desc) where status='published';
create index cares_brochures_user_date on public.cares_brochures(user_id,created_at desc,id desc);
create table public.cares_brochure_actions (
 brochure_id uuid not null references public.cares_brochures(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('saved','helpful')),
 created_at timestamptz not null default now(),
 primary key(brochure_id,user_id,kind)
);
create index cares_brochure_actions_user on public.cares_brochure_actions(user_id,kind,brochure_id);
create table public.cares_brochure_reports (
 brochure_id uuid not null references public.cares_brochures(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 reason text not null check(char_length(reason) between 1 and 300),
 created_at timestamptz not null default now(),
 primary key(brochure_id,user_id)
);
create index cares_brochure_reports_user on public.cares_brochure_reports(user_id);
alter table public.cares_brochures enable row level security;
alter table public.cares_brochure_actions enable row level security;
alter table public.cares_brochure_reports enable row level security;
-- Only the server API can access author IDs, file paths, saved lists and reports.
revoke all on public.cares_brochures, public.cares_brochure_actions, public.cares_brochure_reports from public,anon,authenticated;
grant all on public.cares_brochures, public.cares_brochure_actions, public.cares_brochure_reports to service_role;
create policy brochure_server on public.cares_brochures for all to service_role using(true) with check(true);
create policy brochure_actions_server on public.cares_brochure_actions for all to service_role using(true) with check(true);
create policy brochure_reports_server on public.cares_brochure_reports for all to service_role using(true) with check(true);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cares-brochures','cares-brochures',false,3145728,array['application/pdf','image/jpeg','image/png','image/webp']);
-- Also deny this bucket if an older permissive storage policy covers all buckets.
create policy cares_brochures_server_only on storage.objects as restrictive for all to anon,authenticated
using(bucket_id <> 'cares-brochures') with check(bucket_id <> 'cares-brochures');

create function public.cares_brochure_list(p_listing uuid default null,p_user uuid default null,p_mode text default 'public',p_id uuid default null,p_offset integer default 0)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; more boolean; summary jsonb;
begin
 if p_mode not in ('public','shared','saved') or p_offset is null or p_offset<0 or p_offset>100000
 or (p_mode<>'public' and p_user is null) or (p_mode='public' and p_listing is null and p_id is null) then
 raise exception 'Invalid brochure query' using errcode='22023'; end if;
 with matching as (
  select b.*,l.facility_name from public.cares_brochures b join public.cares_listings l on l.id=b.listing_id
  where (p_id is null or b.id=p_id) and
   ((p_mode='public' and b.status='published' and (p_listing is null or b.listing_id=p_listing))
    or (p_mode='shared' and b.user_id=p_user and b.status<>'deleted')
    or (p_mode='saved' and b.status='published' and exists(select 1 from public.cares_brochure_actions a where a.brochure_id=b.id and a.user_id=p_user and a.kind='saved')))
  order by b.created_at desc,b.id desc limit 21 offset p_offset
 ), visible as (select * from matching order by created_at desc,id desc limit 20)
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',b.id,'listingId',b.listing_id,'facilityName',b.facility_name,'title',b.title,'note',b.note,
  'issuedMonth',b.issued_month,'createdAt',b.created_at,'updatedAt',b.updated_at,'status',b.status,'mine',coalesce(b.user_id=p_user,false),
  'files',(select jsonb_agg(jsonb_build_object('index',n-1,'mime',f->>'mime','size',(f->>'size')::integer) order by n) from jsonb_array_elements(b.files) with ordinality as file(f,n)),
  'helpfulCount',(select count(*) from public.cares_brochure_actions a where a.brochure_id=b.id and a.kind='helpful'),
  'helpful',exists(select 1 from public.cares_brochure_actions a where a.brochure_id=b.id and a.user_id=p_user and a.kind='helpful'),
  'saved',exists(select 1 from public.cares_brochure_actions a where a.brochure_id=b.id and a.user_id=p_user and a.kind='saved')
 ) order by b.created_at desc,b.id desc),'[]'::jsonb),(select count(*)>20 from matching) into result,more from visible b;
 if p_mode<>'public' then
 select jsonb_build_object(
  'shared',(select count(*) from public.cares_brochures where user_id=p_user and status<>'deleted'),
  'saved',(select count(*) from public.cares_brochure_actions a join public.cares_brochures b on b.id=a.brochure_id where a.user_id=p_user and a.kind='saved' and b.status='published'),
  'helpful',(select count(*) from public.cares_brochure_actions a join public.cares_brochures b on b.id=a.brochure_id where b.user_id=p_user and a.kind='helpful' and b.status='published')
 ) into summary;
 end if;
 return jsonb_build_object('items',result,'hasMore',more,'nextOffset',p_offset+20,'summary',summary);
end; $$;

create function public.cares_brochure_action(p_id uuid,p_user uuid,p_kind text,p_enabled boolean)
returns void language plpgsql security invoker set search_path='' as $$
declare author uuid;
begin
 if p_user is null or p_kind not in ('saved','helpful') or p_enabled is null then raise exception 'Invalid action' using errcode='22023'; end if;
 select user_id into author from public.cares_brochures where id=p_id and status='published' for update;
 if author is null then raise exception 'Brochure unavailable' using errcode='P0002'; end if;
 if p_kind='helpful' and author=p_user then raise exception 'Own brochure' using errcode='42501'; end if;
 if p_enabled then insert into public.cares_brochure_actions(brochure_id,user_id,kind) values(p_id,p_user,p_kind) on conflict do nothing;
 else delete from public.cares_brochure_actions where brochure_id=p_id and user_id=p_user and kind=p_kind; end if;
end; $$;

create function public.cares_brochure_report(p_id uuid,p_user uuid,p_reason text)
returns void language plpgsql security invoker set search_path='' as $$
declare author uuid;
begin
 if p_user is null or p_reason is null or char_length(trim(p_reason)) not between 1 and 300 then raise exception 'Invalid report' using errcode='22023'; end if;
 select user_id into author from public.cares_brochures where id=p_id and status='published' for update;
 if author is null then raise exception 'Brochure unavailable' using errcode='P0002'; end if;
 if author=p_user then raise exception 'Own brochure' using errcode='42501'; end if;
 insert into public.cares_brochure_reports(brochure_id,user_id,reason) values(p_id,p_user,trim(p_reason)) on conflict do nothing;
 if (select count(*) from public.cares_brochure_reports where brochure_id=p_id)>=3 then
 update public.cares_brochures set status='hidden',updated_at=now() where id=p_id;
 end if;
end; $$;
revoke all on function public.cares_brochure_list(uuid,uuid,text,uuid,integer),public.cares_brochure_action(uuid,uuid,text,boolean),public.cares_brochure_report(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.cares_brochure_list(uuid,uuid,text,uuid,integer),public.cares_brochure_action(uuid,uuid,text,boolean),public.cares_brochure_report(uuid,uuid,text) to service_role;
commit;
