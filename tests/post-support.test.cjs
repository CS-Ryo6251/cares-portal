const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{PGlite}=require('@electric-sql/pglite'),ts=require('typescript')
const fid='10000000-0000-4000-8000-000000000001',pid='20000000-0000-4000-8000-000000000001',post='30000000-0000-4000-8000-000000000001',draft='30000000-0000-4000-8000-000000000002',u1='40000000-0000-4000-8000-000000000001',u2='40000000-0000-4000-8000-000000000002',l1='50000000-0000-4000-8000-000000000001',l2='50000000-0000-4000-8000-000000000002'
function load(file,mocks={}){const mod={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;new Function('require','module','exports',code)(name=>mocks[name]||require(name),mod,mod.exports);return mod.exports}
test('実PostgreSQL: 投稿いいね合算・再送・取消・公開範囲・権限・既存件数の修復',async t=>{
 const db=new PGlite()
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated,service_role;
 create table facility_portal_profiles(id uuid primary key,facility_id uuid unique,is_published boolean,last_activity_at timestamptz default '2020-01-01T00:00:00Z');
 create table facility_portal_posts(id uuid primary key,facility_id uuid,profile_id uuid references facility_portal_profiles,status text,like_count integer default 0,view_count integer default 0,favorite_count integer default 0,title text,content text,created_at timestamptz default now());
 create table cares_likes(id uuid primary key default gen_random_uuid(),post_id uuid references facility_portal_posts on delete cascade,user_id uuid references auth.users on delete cascade,created_at timestamptz default now(),unique(user_id,post_id));
 create table cares_listings(id uuid primary key,owner_facility_id uuid,is_owner_verified boolean);
 create table cares_listing_heart_totals(listing_id uuid primary key,total numeric default 0);
 create table cares_guest_heart_requests(listing_id uuid,created_at timestamptz default now());create table cares_listing_heart_requests(listing_id uuid,created_at timestamptz default now());
 alter table facility_portal_profiles enable row level security;create policy profiles_read on facility_portal_profiles for select using(is_published);
 alter table facility_portal_posts enable row level security;create policy posts_read on facility_portal_posts for select using(status='published' and exists(select 1 from facility_portal_profiles p where p.id=profile_id and p.is_published));
 grant select on facility_portal_profiles,facility_portal_posts,cares_listings,cares_listing_heart_totals to anon,authenticated;grant all on all tables in schema public to service_role;
 insert into auth.users values('${u1}'),('${u2}');insert into facility_portal_profiles(id,facility_id,is_published) values('${pid}','${fid}',true);
 insert into facility_portal_posts(id,facility_id,profile_id,status,like_count,title,content) values('${post}','${fid}','${pid}','published',99,'合成の投稿','合成データ'),('${draft}','${fid}','${pid}','draft',0,'未公開','公開されない');
 insert into cares_likes(post_id,user_id,created_at) values('${post}','${u1}',now()-interval '8 days');
 insert into cares_listings values('${l1}','${fid}',true),('${l2}','${fid}',true);
 insert into cares_listing_heart_totals values('${l1}',7),('${l2}',3);
 insert into cares_guest_heart_requests(listing_id) values('${l1}');insert into cares_listing_heart_requests(listing_id) values('${l2}');`)
 await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261007101204_cares_post_support.sql'),'utf8'))
 await db.exec('create trigger trg_portal_post_activity after insert or update on facility_portal_posts for each row execute function update_portal_last_activity();')
 const summary=async()=> (await db.query('select * from cares_facility_support_summary')).rows[0]
 const manage=async()=> (await db.query('select cares_facility_support($1) as result',[fid])).rows[0].result
 await t.test('既存件数を正本から直し、サービスが2件でも投稿を一度だけ合算',async()=>{
  await db.exec('set role anon');assert.deepEqual(await summary(),{facility_id:fid,total:'11',direct_total:'10',post_total:'1'})
  assert.deepEqual((await db.query('select total from cares_listing_support_summary order by listing_id')).rows.map(r=>r.total),['11','11'])
 })
 await t.test('個人のいいね履歴・管理集計・内部関数は匿名公開しない',async()=>{
  await assert.rejects(db.query('select * from cares_likes'),/permission denied/)
  await assert.rejects(manage(),/permission denied/)
  await assert.rejects(db.query('select cares_internal.update_post_like_count()'),/permission denied/)
  await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${u2}',false)`)
  assert.equal((await db.query('select * from cares_likes')).rows.length,0)
  await assert.rejects(manage(),/permission denied/)
  await assert.rejects(db.query(`insert into cares_likes(post_id,user_id) values('${post}','${u1}')`),/row-level security/)
  await assert.rejects(db.query(`insert into cares_likes(post_id,user_id) values('${draft}','${u2}')`),/row-level security/)
 })
 await t.test('認証利用者の投稿いいねで両方+1。再送は変化せず、他人の取消は不可',async()=>{
  const insert=`insert into cares_likes(post_id,user_id) values('${post}','${u2}') on conflict(user_id,post_id) do nothing`
  await db.exec(insert);assert.equal((await summary()).total,'12');assert.equal((await db.query(`select like_count from facility_portal_posts where id='${post}'`)).rows[0].like_count,2)
  await db.exec(insert);assert.equal((await summary()).total,'12')
  await db.exec(`delete from cares_likes where user_id='${u1}'`);assert.equal((await summary()).total,'12')
  await db.exec('reset role');assert.equal((await db.query('select last_activity_at from facility_portal_profiles')).rows[0].last_activity_at.toISOString(),'2020-01-01T00:00:00.000Z')
  await db.exec('set role service_role');const s=await manage();assert.equal(s.total,'12');assert.equal(s.direct,'10');assert.equal(s.posts,'2');assert.equal(s.recent,'3');assert.equal(s.recentPosts,'1');assert.equal(s.topPosts[0].id,post)
 })
 await t.test('取消は両方-1、再取消は変化しない',async()=>{
  await db.exec(`set role authenticated;delete from cares_likes where user_id='${u2}' and post_id='${post}'`);assert.equal((await summary()).total,'11')
  await db.exec(`delete from cares_likes where user_id='${u2}' and post_id='${post}'`);assert.equal((await summary()).total,'11')
 })
 await t.test('投稿の非公開・再公開・削除を反映し、非公開プロフィールを公開集計しない',async()=>{
  await db.exec(`reset role;update facility_portal_posts set status='draft' where id='${post}';set role anon`);assert.equal((await summary()).total,'10')
  await db.exec(`reset role;update facility_portal_posts set status='published' where id='${post}';set role anon`);assert.equal((await summary()).total,'11')
  await db.exec(`reset role;update facility_portal_profiles set is_published=false;set role anon`);assert.equal(await summary(),undefined)
  await db.exec(`set role authenticated`);await assert.rejects(db.query(`insert into cares_likes(post_id,user_id) values('${post}','${u2}')`),/row-level security/)
  await db.exec(`reset role;update facility_portal_profiles set is_published=true;delete from facility_portal_posts where id='${post}';set role anon`);assert.equal((await summary()).total,'10')
 })
 await t.test('数値精度を保ち、未確認のサービスを合算しない',async()=>{
  await db.exec(`reset role;update cares_listing_heart_totals set total=999999999999999999999999999 where listing_id='${l1}';update cares_listings set is_owner_verified=false where id='${l2}';set role anon`)
  assert.equal((await summary()).total,'999999999999999999999999999')
 })
 }finally{await db.close()}
})

const sample={status:'ready',total:'60',recent:'7',direct:'10',posts:'50',recentDirect:'2',recentPosts:'5',topPosts:[{id:post,title:'合成の投稿',total:'30',recent:'5'}]}
test('管理集計は所属確認後のRPCを使い、失敗・不正な値を0と表示しない',async()=>{
 const {getFacilitySupport}=load('lib/facility-support.ts'),now=new Date('2026-10-07T10:00:00Z');let args
 const client={rpc:async(name,p)=>{args={name,p};return{data:sample,error:null}}}
 assert.equal((await getFacilitySupport(client,fid,now)).total,'60');assert.deepEqual(args,{name:'cares_facility_support',p:{p_facility_id:fid,p_as_of:now.toISOString()}})
 for(const data of [{...sample,total:60},{...sample,total:'61'},{...sample,recent:'8'},{...sample,topPosts:[{...sample.topPosts[0],id:'bad'}]}])assert.equal((await getFacilitySupport({rpc:async()=>({data,error:null})},fid)).status,'unavailable')
 assert.equal((await getFacilitySupport({rpc:async()=>({error:{message:'private detail'}})},fid)).total,null)
 assert.equal((await getFacilitySupport({rpc:async()=>({data:{status:'unlinked'},error:null})},fid)).status,'unlinked')
})

test('いいねAPI: POST/DELETEの再試行は冪等、本人だけの操作と公開投稿の確認',async()=>{
 const {NextRequest}=require('next/server')
 let authenticated=true,visible=true,liked=false,countFails=false,writes=0
 const client={auth:{getUser:async()=>({data:{user:authenticated?{id:u1}:null},error:null})},from:table=>{
  const filters=[];let columns='',deleting=false
  const q={select:c=>{columns=c;return q},eq:(key,value)=>{filters.push([key,value]);return q},maybeSingle:async()=>({data:table==='facility_portal_posts'&&visible?(columns==='like_count'?{like_count:liked?1:0}:{id:post,facility_id:fid}):null,error:columns==='like_count'&&countFails?{message:'Synthetic outage'}:null}),
   upsert:async(values,options)=>{assert.equal(values.user_id,u1);assert.equal(options.ignoreDuplicates,true);if(!liked){liked=true;writes++}return{error:null}},
   delete:()=>{deleting=true;return q},then:resolve=>{assert.equal(deleting,true);assert.deepEqual(filters,[['user_id',u1],['post_id',post]]);if(liked){liked=false;writes++}return Promise.resolve({error:null}).then(resolve)}};return q
 }}
 const route=load('app/api/likes/route.ts',{'@/lib/supabase-server-auth':{createAuthServerClient:async()=>client},'@/lib/community':{UUID_PATTERN:/^[a-f0-9-]{36}$/i}})
 const req=(method='POST',body={post_id:post},origin='https://cares.test')=>new NextRequest('https://cares.test/api/likes',{method,headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)})
 authenticated=false;assert.equal((await route.POST(req())).status,401);assert.equal(writes,0);authenticated=true
 assert.equal((await route.POST(req('POST',{},'https://other.test'))).status,403)
 assert.equal((await route.POST(req('POST',{post_id:'bad'}))).status,400)
 visible=false;assert.equal((await route.POST(req())).status,404);assert.equal(writes,0);visible=true
 let response=await route.POST(req('POST',{post_id:post,user_id:u2}));assert.deepEqual(await response.json(),{liked:true,like_count:1,facility_id:fid});assert.equal(response.headers.get('cache-control'),'private, no-store')
 await route.POST(req());assert.equal(writes,1)
 await route.DELETE(req('DELETE'));await route.DELETE(req('DELETE'));assert.equal(writes,2);assert.equal(liked,false)
 countFails=true;assert.equal((await route.POST(req())).status,503);assert.equal(liked,true)
 countFails=false;response=await route.POST(req());assert.equal(writes,3);assert.equal((await response.json()).like_count,1)
})
