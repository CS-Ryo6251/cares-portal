const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), { PGlite } = require('@electric-sql/pglite')
const root = path.join(__dirname, '..'), read = file => fs.readFileSync(path.join(root, file), 'utf8')
const id = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`
function load(file, mocks = {}) {
  const mod = { exports: {} }
  const req = name => Object.hasOwn(mocks,name) ? mocks[name] : name.startsWith('.') ? load(path.join(path.dirname(file), name + '.ts'), mocks) : require(name)
  new Function('require','module','exports',ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText)(req,mod,mod.exports)
  return mod.exports
}
const calendar = load('lib/availability-calendar.ts')
const presentation = load('lib/availability-presentation.ts')
test('公開カレンダーは条件付き・数量不明・泊まり退所日・詳細期限を維持し、失効後は旧曜日表へ戻らない', () => {
  const today = calendar.availabilityToday()
  const c = calendar.emptyAvailabilityCalendar('shortStay',today)
  c.slots = [{ id:'one', component:'overnight', unit:'個室', weekday:null,date:today,endDate:calendar.addAvailabilityDays(today,2),time:'',area:'',support:'面談後に判断',status:'conditional',quantity:null,planned:false }]
  assert.equal(calendar.validateAvailabilityCalendar(c),null)
  assert.equal(calendar.slotsForDate(c,calendar.addAvailabilityDays(today,1)).length,1)
  assert.equal(calendar.slotsForDate(c,calendar.addAvailabilityDays(today,2)).length,0)
  const table = presentation.publicAvailabilityTables({calendar:c})[0]
  assert.match(table.rows[0][3],/条件付き.*面談後に判断/)
  assert.doesNotMatch(table.rows[0][3],/0床/)
  const expired = {...c,confirmedOn:calendar.addAvailabilityDays(today,-8),validUntil:calendar.addAvailabilityDays(today,-1)}
  assert.deepEqual(presentation.publicAvailabilityTables({calendar:expired,weekly:{月:'2名'}})[0].rows,[['詳細枠は要再確認','','','掲載期限または適用期間を過ぎています']])
  assert.equal(presentation.publicAvailabilityConditions({accepts:'一般公開条件',client_name:'秘密',detailConfirmation:{confirmedOn:today,validUntil:today}}).length,1)
  assert.match(presentation.publicCalendarPeriod({calendar:c}),new RegExp(today))
  assert.deepEqual(presentation.publicAvailabilityTables({calendar:{schemaVersion:99},weekly:{月:'2名'}})[0].rows,[['詳細枠は要再確認']])
  assert.deepEqual(presentation.publicAvailabilityTables({format:'day',weekly:{月:'2名'}})[0].rows,[['詳細枠は要再確認']])
  assert.deepEqual(presentation.publicAvailabilityConditions({accepts:'以前の条件'}),[])
  const oldDetails={confirmedOn:calendar.addAvailabilityDays(today,-8),validUntil:calendar.addAvailabilityDays(today,-1)}
  assert.deepEqual(presentation.publicAvailabilityConditions({accepts:'以前の条件',detailConfirmation:oldDetails}),[])
})

test('公開ページは同じ版の募集・受入条件・適用期間を表示し、tombstoneの古い条件を表示しない',()=>{
  const React=require('react'),{renderToStaticMarkup}=require('react-dom/server')
  const Component=load('components/ProviderAvailability.tsx',{'@/lib/intake':load('lib/intake.ts'),'@/lib/availability-presentation':presentation}).default
  const current={listing_id:id(1),version:2,status:'conditional',published:true,provider_managed:true,recruitment_status:'active',summary:{accepts:'合成の一般受入条件',detailConfirmation:{confirmedOn:calendar.availabilityToday(),validUntil:calendar.availabilityToday()}},checked_at:new Date().toISOString(),valid_until:calendar.availabilityToday()}
  const html=renderToStaticMarkup(React.createElement(Component,{availability:current,serviceType:'生活介護'}))
  assert.match(html,/条件付きで相談可能/);assert.match(html,/利用者を募集/);assert.match(html,/合成の一般受入条件/)
  const withdrawn=renderToStaticMarkup(React.createElement(Component,{availability:{...current,status:'unknown',published:false},serviceType:'生活介護'}))
  assert.doesNotMatch(withdrawn,/利用者を募集|合成の一般受入条件/)
  const full=renderToStaticMarkup(React.createElement(Component,{availability:{...current,status:'no_vacancy'},serviceType:'生活介護'}))
  assert.doesNotMatch(full,/利用者を募集|合成の一般受入条件/)
})

test('受付は通知先確認を維持し、別の版・非公開版の古い受付文面を出さない',async()=>{
  let version=2,published=true,recipients=true
  const db={rpc:async()=>({data:recipients?[{user_id:id(41)}]:[],error:null}),from:table=>{
    const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:table==='cares_listings'?{id:id(1),facility_name:'合成',is_owner_verified:true,service_type:'生活介護',acceptance_status:'accepting'}:{enabled:true,vacancy_message:'古い受付条件',availability_version:1,message_confirmed_on:calendar.availabilityToday(),message_valid_until:calendar.availabilityToday()},error:null})};return q
  }}
  const server=load('lib/intake-server.ts',{'server-only':{},'next/headers':{},'./supabase':{getSupabaseServiceClient:()=>db},'./supabase-server-auth':{},'./provider-availability':{getListingAvailability:async()=>({[id(1)]:{version,published,provider_managed:true,status:published?'conditional':'unknown'}})}})
  let target=await server.getIntakeTarget(id(1));assert.equal(target.status,'conditional');assert.equal(target.message,'')
  version=1;target=await server.getIntakeTarget(id(1));assert.equal(target.message,'古い受付条件')
  published=false;assert.equal((await server.getIntakeTarget(id(1))).message,'')
  recipients=false;assert.equal(await server.getIntakeTarget(id(1)),null)
})

test('事業所表示は同一サービスの一意な紐づけのみ使い、未公開版をlegacy positiveで上書きしない', async () => {
  const lib = load('lib/provider-availability.ts',{'./supabase':{getSupabaseClient:()=>({from:()=>({select:()=>({in:async()=>({data:[{listing_id:id(1),status:'unknown',provider_managed:true}],error:null})})})})}})
  const row={facility_id:id(10),service_type:'生活介護',availability:{listing_id:id(1),status:'unknown',provider_managed:true}}
  assert.equal(lib.facilityAvailability([row],id(10),'生活介護','has_vacancy'),'unknown')
  assert.equal(lib.facilityAvailability([row,{...row,availability:{status:'has_vacancy'}}],id(10),'生活介護','has_vacancy'),'unknown')
  assert.equal(lib.facilityAvailability([],id(10),'生活介護','limited'),'conditional')
  assert.equal(lib.displayAvailabilityStatus('waitlist'),'conditional')
  const favorites=await lib.withCurrentListingStatus([{listing_id:id(1),cares_listings:{acceptance_status:'accepting',facility_name:'合成'}}])
  assert.equal(favorites[0].cares_listings.acceptance_status,'unknown')
})

test('PostgreSQL: OS正本とCaresビュー・受付RPCの統合、所有権、列順、撤回、失効、再送', async t => {
  const db = new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema storage;
      grant usage on schema public,storage to anon,authenticated,service_role;
      create table cares_listings(id uuid primary key default gen_random_uuid(),facility_name text,service_type text,is_owner_verified boolean default false,owner_facility_id uuid,acceptance_status text,updated_at timestamptz,
        address text,prefecture text,city text,phone text,fax text,corporation_name text,source text,jigyosho_number text unique,data_source_url text);
      create table cares_vacancy_reports(listing_id uuid,vacancy_type text,information_source text,confirmed_on date,valid_until date,reported_at timestamptz,comment text);
      create table cares_owner_claims(listing_id uuid,user_id uuid,status text,reviewed_at timestamptz,reviewed_by uuid);
      create table facilities(id uuid primary key,organization_id uuid,service_type text,status text,name text,address text);
      create table user_profiles(id uuid primary key,user_id uuid,organization_id uuid,is_active boolean,role text);
      create table user_facility_assignments(user_id uuid,facility_id uuid);
      create table facility_portal_profiles(facility_id uuid,acceptance_status text,updated_at timestamptz);
      create table service_posts(id uuid primary key default gen_random_uuid(),type text,facility_id uuid,status text,service_details jsonb,updated_at timestamptz,organization_id uuid,user_id uuid,category text,title text,content text,service_types text[],target_area text);
      create table welfare_directory_snapshots(id uuid primary key,state text,version text default '2026-09');
      create table welfare_directory_entries(id uuid,snapshot_id uuid,searchable boolean,name text,service_type text,address text,prefecture text,city text,phone text,fax text,corporation_name text,number text);
      create table facility_directory_links(directory_entry_id uuid,facility_id uuid,verification_status text,retired_at timestamptz);
      create table facility_master_data(id uuid,jigyosho_number text,facility_name text,service_type text,address text,prefecture text,city text,phone_number text,fax_number text,data_version text);
      create table cares_notifications(id uuid default gen_random_uuid(),user_id uuid,type text,title text,body text,resource_type text,resource_id uuid);
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      grant all on all tables in schema public,storage to service_role;
      grant select on cares_listings,cares_vacancy_reports to anon,authenticated;`)
    const warm = read('supabase/migrations/20261007022927_cares_warm_directory.sql')
    await db.exec(warm.slice(warm.indexOf('create view public.cares_latest_vacancies'),warm.lastIndexOf('commit;')))
    await db.exec(read('supabase/migrations/20261007032000_cares_confirmed_directory_search.sql'))
    const columns = async () => (await db.query("select column_name from information_schema.columns where table_name='cares_directory_listing' order by ordinal_position")).rows.map(row=>row.column_name)
    const oldColumns = await columns()
    await db.exec(read('supabase/migrations/20261007143356_cares_provider_intake.sql'))
    await db.exec(read('tests/fixtures/service-availability-state.sql'))
    await db.exec(read('supabase/migrations/20261106132035_cares_shared_availability.sql'))
    await db.exec(read('supabase/migrations/20261106132057_cares_intake_shared_availability.sql'))
    assert.deepEqual((await columns()).slice(0,oldColumns.length),oldColumns)
    assert.ok((await columns()).includes('public_provider_number'))
    await db.exec(`insert into cares_listings(id,facility_name,service_type,is_owner_verified,owner_facility_id,acceptance_status) values
      ('${id(1)}','合成OS','通所介護',true,'${id(11)}','accepting'),('${id(2)}','合成Cares専用','生活介護',true,null,'accepting'),('${id(3)}','未確認事業所','生活介護',false,null,'accepting'),('${id(4)}','第三者報告のみ','通所介護',false,null,'unknown');
      insert into facilities(id,organization_id,service_type,status) values('${id(11)}','${id(21)}','通所介護','active');
      insert into user_profiles values('${id(31)}','${id(41)}','${id(21)}',true,'manager'),('${id(32)}','${id(42)}','${id(22)}',true,'manager');
      insert into user_facility_assignments values('${id(31)}','${id(11)}'),('${id(32)}','${id(11)}');
      insert into cares_owner_claims values('${id(2)}','${id(45)}','approved',now(),'${id(46)}');
      insert into cares_vacancy_reports select id,'has_vacancy','facility_fax',(now() at time zone 'Asia/Tokyo')::date,(now() at time zone 'Asia/Tokyo')::date+7,now(),'第三者の旧報告' from cares_listings;`)
    const today=calendar.availabilityToday(), until=calendar.addAvailabilityDays(today,7)
    const save=async({listing=1,user=41,status='available',version=0,op=101,publish=true,message='公開案内',messageConfirmed=true}={}) => (await db.query('select cares_intake_save_availability($1,$2,true,$3,$4,$5,$6,$7,$8,$9) result',[id(user),id(listing),message,status,version,id(op),publish,until,messageConfirmed])).rows[0].result
    const status=async listing=>(await db.query('select current_acceptance_status from cares_directory_listing where id=$1',[id(listing)])).rows[0].current_acceptance_status
    await t.test('WAM番号が介護番号と同じでも別の掲載先を作り、所有認証を付けない',async()=>{
      await db.exec(`update cares_listings set jigyosho_number='1234567890' where id='${id(1)}';
        insert into welfare_directory_snapshots(id,state) values('${id(81)}','active');
        insert into welfare_directory_entries(id,snapshot_id,searchable,name,service_type,number) values('${id(82)}','${id(81)}',true,'合成福祉','生活介護','1234567890'),('${id(83)}','${id(81)}',true,'合成福祉','短期入所（障害福祉）','1234567890');`)
      for (const entry of [82,83]) await db.query("select ensure_service_availability_target('welfare',$1)",[id(entry)])
      const rows=(await db.query("select jigyosho_number,public_provider_number,is_owner_verified from cares_listings where source_kind='welfare'")).rows
      assert.equal(rows.length,2)
      for(const row of rows){assert.equal(row.jigyosho_number,null);assert.equal(row.public_provider_number,'1234567890');assert.equal(row.is_owner_verified,false)}
    })
    await t.test('WAM新版は旧snapshotを検索から外し、現役の検証済みaliasだけ同じURLを引き継ぐ',async()=>{
      const oldListing=(await db.query("select id from cares_listings where source_entry_id=$1",[id(82)])).rows[0].id
      await db.exec(`insert into facilities(id,organization_id,service_type,status,name,address) values('${id(14)}','${id(21)}','生活介護','active','合成福祉','合成住所');
        insert into facility_directory_links values('${id(82)}','${id(14)}','verified',null);`)
      const target=(await db.query("select ensure_service_availability_target('welfare',$1) as id",[id(82)])).rows[0].id
      await db.exec(`update welfare_directory_snapshots set state='retired' where id='${id(81)}';
        insert into welfare_directory_snapshots(id,state,version) values('${id(84)}','active','2026-10');
        insert into welfare_directory_entries(id,snapshot_id,searchable,name,service_type,number) values('${id(85)}','${id(84)}',true,'合成福祉','生活介護','1234567890');
        insert into facility_directory_links values('${id(85)}','${id(14)}','verified',null);`)
      assert.equal((await db.query("select ensure_service_availability_target('welfare',$1) as id",[id(85)])).rows[0].id,target)
      await db.exec('set role anon')
      assert.deepEqual((await db.query("select id from cares_directory_listing where source_kind='welfare'")).rows.map(x=>x.id),[oldListing])
      await db.exec('reset role')
      await db.query("update facility_directory_links set retired_at=now() where directory_entry_id=$1",[id(85)])
      await db.exec('set role anon')
      assert.equal((await db.query("select id from cares_directory_listing where source_kind='welfare'")).rows.length,0)
      await db.exec('reset role')
    })
    await t.test('確認済みOS管理者・Cares単独オーナーだけが保存できる',async()=>{
      await db.exec('set role service_role')
      await assert.rejects(save({user:42}),/forbidden/)
      await assert.rejects(save({listing:3}),/forbidden/)
      assert.equal((await save()).version,1)
      assert.equal((await save({listing:2,user:45,status:'conditional',op:102})).version,1)
      assert.equal(await status(2),'conditional')
      assert.equal((await db.query('select availability_version from cares_intake_settings where listing_id=$1',[id(2)])).rows[0].availability_version,1)
      await assert.rejects(db.query('select cares_intake_update_settings($1,$2,true,$3,$4)',[id(41),id(1),'旧API','has_vacancy']),/requires_version/)
    })
    await t.test('再送は同じ結果、別内容同ID・古い版は拒否し新しい状態を巻き戻さない',async()=>{
      assert.equal((await save()).version,1)
      await assert.rejects(save({message:'別内容'}),/idempotency/)
      await assert.rejects(save({op:103}),/version/)
      await save({status:'unavailable',version:1,op:104,message:'新しい案内'})
      assert.equal(await status(1),'no_vacancy')
      assert.equal((await save()).version,1)
      assert.equal(await status(1),'no_vacancy')
      assert.equal((await db.query('select vacancy_message from cares_intake_settings where listing_id=$1',[id(1)])).rows[0].vacancy_message,'新しい案内')
    })
    await t.test('一般状態だけの再確認では受付文面の期限を延ばさず、未確認の書換えも公開しない',async()=>{
      const oldDate=calendar.addAvailabilityDays(today,-1)
      await db.query('update cares_intake_settings set message_confirmed_on=$1::date-7,message_valid_until=$1 where listing_id=$2',[oldDate,id(2)])
      await save({listing:2,user:45,status:'conditional',version:1,op:109,messageConfirmed:false})
      let settings=(await db.query('select * from cares_intake_settings where listing_id=$1',[id(2)])).rows[0]
      assert.equal(new Date(settings.message_valid_until).toISOString().slice(0,10),oldDate)
      await save({listing:2,user:45,status:'conditional',version:2,op:110,message:'未確認の新しい案内',messageConfirmed:false})
      settings=(await db.query('select * from cares_intake_settings where listing_id=$1',[id(2)])).rows[0]
      assert.equal(settings.message_confirmed_on,null);assert.equal(settings.message_valid_until,null)
      await save({listing:2,user:45,status:'conditional',version:3,op:111,message:'内容確認済みの案内',messageConfirmed:true})
      settings=(await db.query('select * from cares_intake_settings where listing_id=$1',[id(2)])).rows[0]
      assert.equal(new Date(settings.message_confirmed_on).toISOString().slice(0,10),today);assert.equal(new Date(settings.message_valid_until).toISOString().slice(0,10),until)
    })
    await t.test('OS供給側: 保存のみ・募集の追従・満員停止・明示再開・再送・stale rollback・他法人拒否',async()=>{
      await db.exec(`insert into facilities(id,organization_id,service_type,status,name,address) values('${id(12)}','${id(21)}','通所介護','active','合成募集事業所','合成市'),('${id(13)}','${id(21)}','生活介護','active','合成競合事業所','合成市');
        insert into user_facility_assignments values('${id(31)}','${id(12)}'),('${id(31)}','${id(13)}');
        insert into cares_listings(id,facility_name,service_type,is_owner_verified,owner_facility_id) values('${id(5)}','合成募集','通所介護',true,'${id(12)}'),('${id(6)}','合成競合','生活介護',true,'${id(13)}');`)
      const summary={format:'day',weekly:{火:'1名'},accepts:'合成の公開条件',detailConfirmation:{confirmedOn:today,validUntil:until}}
      const provider=async({facility=12,user=41,version=0,op=201,status='available',recruit=false,value=summary,title='合成募集',content='公開の募集本文'}={})=>(await db.query('select service_availability_provider_update($1,$2,$3,$4,$5,$6,true,true,$7,$8,$9,$10) result',[id(facility),id(user),version,id(op),status,JSON.stringify(value),until,recruit,title,content])).rows[0].result
      const count=async()=>(await db.query("select count(*)::integer as n from service_posts where facility_id=$1",[id(12)])).rows[0].n
      const posts=async()=>(await db.query('select * from service_posts where facility_id=$1',[id(12)])).rows
      assert.equal((await provider()).version,1);assert.equal(await count(),0)
      const recruited=await provider({version:1,op:202,recruit:true});assert.equal(recruited.version,2);assert.equal(await count(),1)
      const original=(await posts())[0].id
      await provider({version:2,op:203,value:{...summary,weekly:{火:'2名'}}})
      assert.equal((await posts())[0].service_details.availability.weekly.火,'2名')
      assert.equal((await posts())[0].service_details.availabilityVersion,3)
      await provider({version:3,op:204,status:'unavailable'});assert.equal((await posts())[0].status,'inactive')
      await provider({version:4,op:205});assert.equal((await posts())[0].status,'inactive')
      const reopened=await provider({version:5,op:206,recruit:true});assert.equal((await posts())[0].status,'active');assert.equal((await posts())[0].id,original)
      assert.deepEqual(await provider({version:5,op:206,recruit:true}),reopened);assert.equal(await count(),1)
      await assert.rejects(provider({version:5,op:206,recruit:true,title:'同じ操作IDで別のタイトル'}),/idempotency/)
      await assert.rejects(provider({version:5,op:206,recruit:false}),/idempotency/)
      await assert.rejects(provider({facility:13,version:1,op:207,recruit:true}),/version/)
      assert.equal((await db.query('select * from service_posts where facility_id=$1',[id(13)])).rows.length,0)
      await assert.rejects(provider({user:42,version:6,op:208,recruit:true}),/forbidden/)
      const oldConfirmation={confirmedOn:calendar.addAvailabilityDays(today,-8),validUntil:calendar.addAvailabilityDays(today,-1)}
      await provider({version:6,op:209,value:{...summary,detailConfirmation:oldConfirmation}})
      await save({listing:5,version:7,op:210,messageConfirmed:false})
      const retained=(await db.query('select summary from service_availability_current c join service_availability_targets t on t.id=c.target_id where t.listing_id=$1',[id(5)])).rows[0].summary
      assert.deepEqual(retained.detailConfirmation,oldConfirmation)
      assert.equal(retained.weekly.火,'1名')
      assert.deepEqual(presentation.publicAvailabilityTables(retained)[0].rows,[['詳細枠は要再確認']])
      // Expired recruitment cannot reopen through a general availability save.
      await db.query("update service_availability_current set valid_until=$1 where target_id=(select id from service_availability_targets where listing_id=$2)",[calendar.addAvailabilityDays(today,-1),id(5)])
      await provider({version:8,op:211});assert.equal((await posts())[0].status,'inactive')
      await db.query("update service_posts set title='PRIVATE_OLD_TITLE',content='PRIVATE_OLD_CONTENT',service_details=service_details || '{\"privateClient\":\"PRIVATE_MARKER\"}'::jsonb where id=$1",[original])
      await provider({version:9,op:212,recruit:true,title:null,content:null})
      const safePost=(await posts())[0]
      assert.equal(safePost.status,'active');assert.equal(safePost.id,original)
      assert.doesNotMatch(JSON.stringify(safePost),/PRIVATE_/)
      const mixed=calendar.emptyAvailabilityCalendar('day',today)
      mixed.slots=[{id:'day',component:'day',unit:'',weekday:'火',date:null,endDate:null,time:'',area:'',support:'公開枠',status:'available',quantity:1,planned:false},
        {id:'hidden',component:'visit',unit:'',weekday:'水',date:null,endDate:null,time:'',area:'PRIVATE_MARKER',support:'',status:'available',quantity:1,planned:false}]
      await provider({version:10,op:213,value:{...summary,calendar:mixed,calendarEnabled:true,homeVisit:{PRIVATE_MARKER:'下書き'}}})
      const privateSummary=(await db.query('select summary from service_availability_current c join service_availability_targets t on t.id=c.target_id where t.listing_id=$1',[id(5)])).rows[0].summary
      assert.equal(privateSummary.calendar.slots.length,2);assert.match(JSON.stringify(privateSummary),/PRIVATE_MARKER/)
      await db.exec('set role anon')
      const publicSummary=(await db.query('select summary from service_availability_public where listing_id=$1',[id(5)])).rows[0].summary
      assert.equal(publicSummary.calendar.slots.length,1);assert.doesNotMatch(JSON.stringify(publicSummary),/PRIVATE_MARKER/)
      await assert.rejects(db.query('select * from service_availability_projection'),/permission denied/)
      await db.exec('reset role');await db.exec('set role service_role')
      const sanitized=async value=>(await db.query("select service_availability_public_summary($1,'通所介護') as summary",[JSON.stringify(value)])).rows[0].summary
      const legacy=await sanitized({...privateSummary,calendarEnabled:false})
      assert.equal(legacy.calendar,undefined);assert.equal(legacy.weekly.火,'1名');assert.equal(legacy.homeVisit,undefined)
      // Detail expiration is evaluated on read even while the general state is fresh.
      await db.query("update service_availability_projection set summary=jsonb_set(summary,'{calendar,validUntil}',to_jsonb($1::text)) where listing_id=$2",[calendar.addAvailabilityDays(today,-1),id(5)])
      await db.exec('set role anon')
      const expiredPublic=(await db.query('select summary from service_availability_public where listing_id=$1',[id(5)])).rows[0].summary
      assert.equal(expiredPublic.calendar,undefined);assert.equal(expiredPublic.weekly,undefined)
      await db.exec('reset role');await db.exec('set role service_role')

    })
    await t.test('撤回・期限切れはtombstoneで古い公式・第三者positiveへ戻らず、未移行は従来通り',async()=>{
      await save({status:'available',version:2,op:105,publish:false,message:'非公開の案内'})
      assert.equal(await status(1),'unknown')
      assert.equal(await status(4),'has_vacancy')
      await db.query("update service_availability_projection set valid_until=(now() at time zone 'Asia/Tokyo')::date-1 where listing_id=$1",[id(2)])
      await db.exec('set role anon')
      assert.equal(await status(2),'unknown')
      assert.equal((await db.query('select * from cares_confirmed_directory_listing where id=any($1)',[[id(1),id(2)]])).rows.length,0)
      const row=(await db.query('select * from cares_current_availability where listing_id=$1',[id(2)])).rows[0]
      assert.equal(row.provider_managed,true);assert.deepEqual(row.summary,{});assert.equal(row.status,'unknown')
      for(const table of ['service_availability_current','service_availability_history','service_availability_projection','service_availability_target_aliases','cares_availability_operations']) await assert.rejects(db.query(`select * from ${table}`),/permission denied/)
      await assert.rejects(save({op:106}),/permission denied/)
    })
  } finally { await db.close() }
})
