const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{PGlite}=require('@electric-sql/pglite'),ts=require('typescript')
function load(file){const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>name.startsWith('.')?load(path.join('lib',name+'.ts')):require(name),mod,mod.exports);return mod.exports}
const {rankingFilters,rankingUrl,readSupportRanking}=load('lib/support-ranking.ts')
const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`,asOf='2026-10-07T12:00:00Z'

test('ランキング: 地域・種別・期間の検証と切替URL',()=>{
 assert.deepEqual(rankingFilters({period:'bad',prefecture:['山形県','東京都'],service_type:'__proto__'}),{period:'week',prefecture:'山形県',service:''})
 assert.deepEqual(rankingFilters({period:'all',prefecture:'無効',service_type:'通所介護'}),{period:'all',prefecture:'',service:'通所介護'})
 const url=new URL(rankingUrl({period:'all',prefecture:'山形県',service:'通所介護'}),'https://example.invalid')
 assert.equal(url.pathname,'/ranking');assert.equal(url.searchParams.get('period'),'all');assert.equal(url.searchParams.get('prefecture'),'山形県');assert.equal(url.searchParams.get('service_type'),'通所介護')
})
test('ランキング: 取得失敗・不正値を0件として扱わず大きい数字の精度を保持',()=>{
 const item={id:id(1),name:'合成',serviceType:'通所介護',prefecture:null,address:null,coverImage:null,overview:null,rank:1,total:'999999999999999999999999',direct:'999999999999999999999998',posts:'1'}
 const value={period:'week',asOf,periodStart:'2026-10-04T15:00:00Z',items:[item]}
 assert.equal(readSupportRanking(value).items[0].total,item.total)
 for(const bad of [null,{}, {...value,asOf:'bad'}, {...value,items:[{...item,total:42}]}, {...value,items:[{...item,total:'2'}]}, {...value,items:[item,item]}])assert.equal(readSupportRanking(bad),null)
 assert.deepEqual(readSupportRanking({...value,items:[]}).items,[])
})

test('実PostgreSQL: 応援ランキングの週境界・重複・公開条件・順位・権限',async t=>{
 const db=new PGlite()
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table cares_listings(id uuid primary key,facility_name text,service_type text,prefecture text,address text,overview text,jigyosho_number text,owner_facility_id uuid,is_owner_verified boolean);
 create table facility_portal_profiles(id uuid primary key,facility_id uuid unique,is_published boolean,cover_image_url text,overview text);
 create table facility_portal_posts(id uuid primary key,profile_id uuid,facility_id uuid,status text,like_count integer);
 create table cares_likes(post_id uuid,created_at timestamptz);
 create table cares_guest_heart_requests(listing_id uuid,created_at timestamptz);
 create table cares_listing_heart_requests(listing_id uuid,created_at timestamptz);
 create table cares_listing_heart_totals(listing_id uuid,total numeric);
 grant usage on schema public to anon,authenticated,service_role;grant select on all tables in schema public to service_role;
 insert into cares_listings values
 ('${id(1)}','合成A','通所介護','山形県','公開住所','公表説明','1','${id(10)}',true),
 ('${id(2)}','合成A・別掲載','訪問介護','山形県','公開住所','公表説明','2','${id(10)}',true),
 ('${id(3)}','合成B','通所介護','東京都','公開住所',null,'3',null,false),
 ('${id(4)}','合成C','訪問介護','東京都','公開住所',null,'4','${id(20)}',true),
 ('${id(5)}','ゼロ件','通所介護','東京都','公開住所',null,'5',null,false);
 insert into facility_portal_profiles values('${id(11)}','${id(10)}',true,'https://example.invalid/public.jpg','公開紹介'),('${id(21)}','${id(20)}',false,'https://example.invalid/private.jpg','非公開紹介');
 insert into facility_portal_posts values('${id(12)}','${id(11)}','${id(10)}','published',2),('${id(13)}','${id(11)}','${id(10)}','draft',100),('${id(22)}','${id(21)}','${id(20)}','published',100);
 insert into cares_likes values('${id(12)}','2026-10-04T14:59:59Z'),('${id(12)}','2026-10-04T15:00:00Z'),('${id(13)}','2026-10-06T12:00:00Z'),('${id(22)}','2026-10-06T12:00:00Z');
 insert into cares_guest_heart_requests values('${id(1)}','2026-10-04T14:59:59Z'),('${id(1)}','2026-10-04T15:00:00Z'),('${id(1)}','2026-10-08T00:00:00Z'),('${id(3)}','2026-10-06T00:00:00Z'),('${id(3)}','2026-10-06T01:00:00Z'),('${id(3)}','2026-10-06T02:00:00Z'),('${id(4)}','2026-10-06T01:00:00Z');
 insert into cares_listing_heart_requests values('${id(2)}','2026-10-05T00:00:00Z');
 insert into cares_listing_heart_totals values('${id(1)}',10),('${id(2)}',5),('${id(3)}',3),('${id(4)}',1);`)
 const migration=fs.readdirSync('supabase/migrations').find(file=>file.endsWith('_cares_support_ranking.sql'))
 await db.exec(fs.readFileSync(path.join('supabase/migrations',migration),'utf8'))
 const lookup=fs.readdirSync('supabase/migrations').find(file=>file.endsWith('_cares_support_ranking_lookup.sql'))
 await db.exec(fs.readFileSync(path.join('supabase/migrations',lookup),'utf8'))
 await db.exec(fs.readFileSync(path.join('supabase/migrations',fs.readdirSync('supabase/migrations').find(file=>file.endsWith('_cares_ranking_service_types.sql'))),'utf8'))
 const query=async(period='week',prefecture='',service='')=>(await db.query('select cares_support_ranking($1,$2,$3,$4) as result',[period,prefecture,service,asOf])).rows[0].result
 await t.test('日本時間月曜0時から・未来を除外・投稿合算は1回・同数同順位',async()=>{
  const result=await query();assert.equal(Date.parse(result.periodStart),Date.parse('2026-10-04T15:00:00Z'))
  assert.deepEqual(result.items.map(i=>[i.id,i.total,i.rank]),[[id(1),'3',1],[id(3),'3',1],[id(4),'1',3]])
  assert.equal(result.items[0].direct,'2');assert.equal(result.items[0].posts,'1')
  assert.equal(result.items[2].coverImage,null);assert.equal(result.items[2].overview,null)
 })
 await t.test('累計は数値順・地域と種別で絞ってから順位を付け、0件を区別',async()=>{
  assert.equal((await query('all')).items[0].total,'17')
  assert.deepEqual((await query('week','東京都')).items.map(i=>i.rank),[1,2])
  assert.deepEqual((await query('week','山形県','訪問介護')).items.map(i=>[i.id,i.total]),[[id(2),'3']])
  assert.deepEqual((await query('week','沖縄県')).items,[])
  await assert.rejects(query('bad'),/Invalid ranking period/)
 })
 await t.test('種別の配列フィルターでも集計・順位・同一事業所の重複排除を保つ',async()=>{
  const queryTypes=async types=>(await db.query('select cares_support_ranking_for_services($1,$2,$3,$4) as result',['all','',types,asOf])).rows[0].result
  assert.deepEqual(await queryTypes([]),await query('all'))
  assert.deepEqual(await queryTypes(['通所介護']),await query('all','','通所介護'))
  assert.deepEqual((await queryTypes(['通所介護','訪問介護'])).items.map(i=>[i.id,i.total,i.rank]),[[id(1),'17',1],[id(3),'3',2],[id(4),'1',3]])
  await db.exec(`insert into cares_listings(id,facility_name,service_type) values('${id(6)}','旧称デイ','デイサービス'),('${id(7)}','地域密着','地域密着型通所介護');insert into cares_listing_heart_totals values('${id(6)}',8),('${id(7)}',99);`)
  const result=await queryTypes(['通所介護','デイサービス'])
  assert.deepEqual(result.items.map(i=>[i.id,i.total,i.rank]),[[id(1),'17',1],[id(6),'8',2],[id(3),'3',3]])
  assert.deepEqual((await queryTypes(['地域包括支援センター'])).items,[])
  await db.exec(`delete from cares_listing_heart_totals where listing_id in ('${id(6)}','${id(7)}');delete from cares_listings where id in ('${id(6)}','${id(7)}');`)
  for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(queryTypes([]),/permission denied/);await db.exec('reset role')}
 })
 await t.test('取消・投稿非公開・事業所非公開でいいねと非公開情報を除外',async()=>{
  await db.exec(`delete from cares_likes where post_id='${id(12)}' and created_at>='2026-10-04T15:00:00Z';update facility_portal_posts set like_count=1 where id='${id(12)}';`)
  assert.equal((await query()).items.find(i=>i.id===id(1)).total,'2')
  await db.exec(`update facility_portal_posts set status='draft' where id='${id(12)}'`)
  assert.equal((await query('all')).items[0].total,'15')
  await db.exec(`update facility_portal_profiles set is_published=false where facility_id='${id(10)}'`)
  const result=await query('all');assert.equal(result.items[0].total,'10');assert.equal(result.items[0].coverImage,null);assert.equal(result.items[0].overview,'公表説明')
 })
 await t.test('RPCはサーバー専用で個人履歴を公開しない',async()=>{
  for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(query(),/permission denied/);await db.exec('reset role')}
  await db.exec('set role service_role');const result=await query();assert.ok(readSupportRanking(result));assert.equal(JSON.stringify(result).includes('user_id'),false);await db.exec('reset role')
 })
 await t.test('大きな数字を丸めず、最大50事業所で安定して取得',async()=>{
  await db.exec(`update cares_listing_heart_totals set total=999999999999999999999999999 where listing_id='${id(3)}'`)
  for(let n=100;n<160;n++)await db.exec(`insert into cares_listings(id,facility_name,service_type) values('${id(n)}','追加${n}','通所介護');insert into cares_listing_heart_totals values('${id(n)}',1)`)
  const result=await query('all');assert.equal(result.items.length,50);assert.equal(result.items[0].total,'999999999999999999999999999');assert.equal(result.items[0].id,id(3));assert.equal(JSON.stringify(result),JSON.stringify(await query('all')))
 })
 }finally{await db.close()}
})
