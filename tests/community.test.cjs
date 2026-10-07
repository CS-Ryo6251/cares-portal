const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const { PGlite } = require('@electric-sql/pglite')
const { NextRequest } = require('next/server')
function load(file, mocks = {}) {
  const mod = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
  const req = name => mocks[name] || (name === '@/lib/community' || name === './community' ? load('lib/community.ts') : require(name))
  new Function('require','module','exports',code)(req,mod,mod.exports)
  return mod.exports
}
const { validateVacancy, currentVacancy, formatHearts, japanDate } = load('lib/community.ts')
const body = { vacancy_type: 'has_vacancy', information_source: 'facility_fax', confirmed_on: '2026-10-07', valid_until: '2026-10-14', publication_confirmed: true, comment: '火曜日に1名' }

test('日付はJST。確認日・期限・情報源・公開確認・型を検証', () => {
  assert.equal(japanDate(new Date('2026-10-06T15:00:00Z')), '2026-10-07')
  assert.equal(validateVacancy(body,'2026-10-07'),null)
  for (const change of [{confirmed_on:'2026-10-08'}, {confirmed_on:'2026-02-30'}, {valid_until:'2026-10-06'}, {valid_until:'2026-11-07'}, {information_source:'toString'}, {comment:123}, {publication_confirmed:false}]) {
    assert.ok(validateVacancy({...body,...change},'2026-10-07'),JSON.stringify(change))
  }
})
test('新しい情報を優先し、期限切れや未確認から古い空きありを復活させない', () => {
  const old = {...body, reported_at:'2026-10-07T00:00:00Z'}
  const recent = {...old, vacancy_type:'no_vacancy',confirmed_on:'2026-10-08',valid_until:'2026-10-08',reported_at:'2026-10-08T00:00:00Z'}
  assert.equal(currentVacancy([old,recent],'2026-10-08').vacancy_type,'no_vacancy')
  assert.equal(currentVacancy([old,recent],'2026-10-09'),null)
  assert.equal(currentVacancy([{vacancy_type:'has_vacancy',reported_at:old.reported_at}],'2026-10-07'),null)
  assert.equal(currentVacancy([{...old,vacancy_type:'unknown'}],'2026-10-07').vacancy_type,'unknown')
})
test('ハートは巨大な累計でも丸めず、未取得を0と表示しない', () => {
  assert.equal(formatHearts('900719925474099312345'),'900,719,925,474,099,312,345')
  assert.equal(formatHearts(null),'—')
  assert.equal(formatHearts('0'),'0')
})

const listing='10000000-0000-4000-8000-000000000001'
const user='20000000-0000-4000-8000-000000000001'
const requestId='30000000-0000-4000-8000-000000000001'
const auth = u => ({createAuthServerClient:async()=>({auth:{getUser:async()=>({data:{user:u},error:null})}})})
const context={params:Promise.resolve({id:listing})}
function post(payload) {return new NextRequest('http://localhost/api',{method:'POST',headers:{'content-type':'application/json',origin:'http://localhost'},body:JSON.stringify(payload)})}

test('ハートAPI：ログイン不要・サーバー識別子・再送ID・外部サイトからの送信拒否', async () => {
  let call
  const service={getSupabaseServiceClient:()=>({rpc:async(name,args)=>{call={name,args};return {data:{total:'6'},error:null}}})}
  const visitor={'@/lib/heart-visitor':{heartVisitor:()=>({visitorHash:'a'.repeat(64),networkHash:'b'.repeat(64)}),setHeartVisitor:r=>r}}
  const route=load('app/api/directory/[id]/hearts/route.ts',{'@/lib/supabase':service,'@/lib/hearts':{getHeartSummaries:async()=>null},...visitor})
  assert.equal((await route.POST(post({request_id:'bad'}),context)).status,400)
  const res=await route.POST(post({request_id:requestId,user_id:'another-account',visitor_hash:'spoofed'}),context)
  assert.equal(res.status,200)
  assert.deepEqual(await res.json(),{total:'6'})
  assert.equal(call.name,'cares_send_guest_heart')
  assert.equal(call.args.p_visitor_hash,'a'.repeat(64))
  assert.equal(Object.hasOwn(call.args,'p_user_id'),false)
  assert.equal(call.args.p_request_id,requestId)
  call=undefined
  const foreign=post({request_id:requestId});foreign.headers.set('origin','https://another.example')
  assert.equal((await route.POST(foreign,context)).status,403)
  assert.equal(call,undefined)
  assert.equal((await route.GET(post({}),context)).status,503)
})

test('匿名Cookieは署名を検証し、IPを公開せず、応答に安全なCookieを設定', () => {
  const old=process.env.SUPABASE_SERVICE_ROLE_KEY
  process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-test-key-not-a-real-credential'
  try {
    const {heartVisitor,setHeartVisitor}=load('lib/heart-visitor.ts')
    const req=new NextRequest('https://cares.example/api',{headers:{'x-forwarded-for':'192.0.2.10'}})
    const first=heartVisitor(req)
    assert.match(first.visitorHash,/^[a-f0-9]{64}$/)
    assert.match(first.networkHash,/^[a-f0-9]{64}$/)
    assert.ok(!JSON.stringify(first).includes('192.0.2.10'))
    const again=new NextRequest(req.url,{headers:{cookie:`cares-heart-visitor=${first.cookieValue}`,'x-forwarded-for':'192.0.2.10'}})
    assert.equal(heartVisitor(again).visitorHash,first.visitorHash)
    assert.equal(heartVisitor(again).cookieValue,null)
    const fake=new NextRequest(req.url,{headers:{cookie:`cares-heart-visitor=${first.cookieValue.slice(0,-1)}x`}})
    assert.notEqual(heartVisitor(fake).visitorHash,first.visitorHash)
    const {NextResponse}=require('next/server')
    const res=setHeartVisitor(NextResponse.json({total:'1'}),first)
    assert.match(res.headers.get('set-cookie'),/HttpOnly/)
    assert.match(res.headers.get('set-cookie'),/SameSite=lax/i)
  } finally {if(old===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=old}
})
test('空き情報API：ログインと公開確認なしでは書き込まない', async () => {
  let writes=0
  const route=load('app/api/directory/[id]/vacancy/route.ts',{'@/lib/supabase-server-auth':auth(null),'@/lib/supabase':{getSupabaseServiceClient:()=>{writes++;throw Error()}}})
  assert.equal((await route.POST(post(body),context)).status,401)
  assert.equal(writes,0)
  const logged=load('app/api/directory/[id]/vacancy/route.ts',{'@/lib/supabase-server-auth':auth({id:user}),'@/lib/supabase':{getSupabaseServiceClient:()=>{writes++;throw Error()}}})
  assert.equal((await logged.POST(post({...body,publication_confirmed:false}),context)).status,400)
  assert.equal(writes,0)
})

test('良いところAPI：実体験確認を必須とし、ログイン時に存在しない氏名列を書かない', async () => {
  let inserted
  const service={getSupabaseServiceClient:()=>({from:()=>({
    select:()=>({eq:()=>({single:async()=>({data:{id:listing},error:null}),gte:async()=>({count:0,error:null})})}),
    insert:async value=>{inserted=value;return {error:null}}
  })})}
  const route=load('app/api/directory/[id]/notes/route.ts',{'@/lib/supabase':service,'@/lib/supabase-server-auth':auth({id:user})})
  assert.equal((await route.POST(post({reporter_type:'family',content:'丁寧でした'}),context)).status,400)
  assert.equal(inserted,undefined)
  assert.equal((await route.POST(post({reporter_type:'family',content:10,good_point_confirmed:true}),context)).status,400)
  assert.equal((await route.POST(post({reporter_type:'family',content:'見学時の説明が丁寧でした',good_point_confirmed:true}),context)).status,201)
  assert.equal(inserted.user_id,user)
  assert.equal(Object.hasOwn(inserted,'reporter_name'),false)
})

test('PostgreSQL: migration・集計・再送・レート制限・公開権限・日付境界', async t => {
  const db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    create table public.cares_listings(id uuid primary key,facility_name text,acceptance_status text);
    create table public.cares_vacancy_reports(id uuid primary key default gen_random_uuid(),listing_id uuid references cares_listings,reporter_ip_hash text,vacancy_type text,comment text,reported_at timestamptz default now(),is_verified boolean default false);
    create table public.cares_professional_notes(id uuid primary key default gen_random_uuid(),listing_id uuid,reporter_type text,content text,created_at timestamptz default now(),reporter_ip_hash text,user_id uuid);
    create table public.cares_user_ratings(user_id uuid, listing_id uuid,rating int);
    alter table cares_user_ratings enable row level security;
    alter table cares_vacancy_reports enable row level security;
    alter table cares_professional_notes enable row level security;
    create policy cares_user_ratings_public_read on cares_user_ratings for select using(true);
    create policy cares_vacancy_public_read on cares_vacancy_reports for select using(true);
    create policy cares_notes_public_read on cares_professional_notes for select using(true);
    grant select on cares_listings to anon,authenticated,service_role;
    grant all on cares_vacancy_reports,cares_professional_notes,cares_user_ratings to anon,authenticated,service_role;
    insert into cares_listings values('${listing}','架空のケア事業所','accepting');
    insert into auth.users values('${user}'),('20000000-0000-4000-8000-000000000002');
    insert into cares_user_ratings values('${user}','${listing}',5);`)
  await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261007022927_cares_warm_directory.sql'),'utf8'))
  await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261007024047_cares_community_privacy.sql'),'utf8'))
  await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261007031500_cares_directory_name_order.sql'),'utf8'))
  await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261007032000_cares_confirmed_directory_search.sql'),'utf8'))
  await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261007041342_cares_guest_hearts.sql'),'utf8'))
  const send=async (u=user,r=requestId)=> (await db.query('select public.cares_send_listing_heart($1,$2,$3) as result',[listing,u,r])).rows[0].result
  await db.exec('set role service_role')
  await t.test('初回・同じ送信の再実行・別人の応援',async()=>{
    assert.deepEqual(await send(),{total:'1',supporters:'1'})
    assert.deepEqual(await send(),{total:'1',supporters:'1'})
    assert.deepEqual(await send('20000000-0000-4000-8000-000000000002'),{total:'2',supporters:'2'})
  })
  await t.test('短時間連打を拒否し、間をあけた同一人の再応援を加算',async()=>{
    await assert.rejects(send(user,'30000000-0000-4000-8000-000000000003'),/HEART_TOO_FAST/)
    await db.exec(`update cares_listing_heart_supporters set last_sent_at=now()-interval '10 seconds'`)
    assert.deepEqual(await send(user,'30000000-0000-4000-8000-000000000003'),{total:'3',supporters:'2'})
  })
  await t.test('巨大な累計と応答文字列を維持',async()=>{
    await db.exec(`update cares_listing_heart_totals set total=900719925474099312345; update cares_listing_heart_supporters set last_sent_at=now()-interval '10 seconds'`)
    assert.equal((await send(user,'30000000-0000-4000-8000-000000000004')).total,'900719925474099312346')
  })
  await t.test('公開するのは集計だけ。ユーザーID・IP・書込RPC・旧星は公開不可',async()=>{
    await db.exec('set role anon')
    assert.equal((await db.query('select total from cares_listing_heart_summary')).rows[0].total,'900719925474099312346')
    await assert.rejects(db.query('select * from cares_listing_heart_supporters'),/permission denied/)
    await assert.rejects(db.query('select reporter_ip_hash from cares_vacancy_reports'),/permission denied/)
    await assert.rejects(db.query('select user_id from cares_professional_notes'),/permission denied/)
    await assert.rejects(send(),/permission denied/)
    await assert.rejects(db.query(`insert into cares_professional_notes(content) values('bad')`),/permission denied/)
    await assert.rejects(db.query('select * from cares_user_ratings'),/permission denied/)
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${user}',false)`)
    assert.equal((await db.query('select * from cares_user_ratings')).rows.length,1)
    await db.exec("select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',false)")
    assert.equal((await db.query('select * from cares_user_ratings')).rows.length,0)
    await db.exec('set role service_role')
  })
  await t.test('新しい期限切れが過去の空きありを覆し、一覧の絞り込みにも反映',async()=>{
    await db.exec(`insert into cares_vacancy_reports(listing_id,vacancy_type,confirmed_on,valid_until) values
      ('${listing}','has_vacancy',(now() at time zone 'Asia/Tokyo')::date-2,(now() at time zone 'Asia/Tokyo')::date+5),
      ('${listing}','no_vacancy',(now() at time zone 'Asia/Tokyo')::date-1,(now() at time zone 'Asia/Tokyo')::date-1); set role anon;`)
    assert.equal((await db.query('select current_acceptance_status from cares_directory_listing')).rows[0].current_acceptance_status,'unknown')
    assert.equal((await db.query("select * from cares_directory_listing where current_acceptance_status='has_vacancy'")).rows.length,0)
    assert.equal((await db.query('select * from cares_confirmed_directory_listing')).rows.length,0)
    await db.exec('set role service_role')
    await db.exec(`insert into cares_vacancy_reports(listing_id,vacancy_type,confirmed_on,valid_until) values('${listing}','has_vacancy',(now() at time zone 'Asia/Tokyo')::date,(now() at time zone 'Asia/Tokyo')::date); set role anon;`)
    assert.equal((await db.query('select current_acceptance_status from cares_directory_listing')).rows[0].current_acceptance_status,'has_vacancy')
    assert.equal((await db.query('select current_acceptance_status from cares_confirmed_directory_listing')).rows[0].current_acceptance_status,'has_vacancy')
  })
  await t.test('匿名ハート：初回Cookieなし・応答紛失後の再送・繰返し・連打・権限',async()=>{
    await db.exec('set role service_role')
    const before=BigInt((await db.query('select total::text as total from cares_listing_heart_totals')).rows[0].total)
    const guest=(request=requestId,visitor='a'.repeat(64),network='b'.repeat(64),id=listing)=>db.query('select cares_send_guest_heart($1,$2,$3,$4) as result',[id,request,visitor,network]).then(r=>r.rows[0].result)
    assert.deepEqual(await guest(),{total:String(before+1n)})
    // Lost Set-Cookie response must not increment again, even with a new cookie/network.
    assert.deepEqual(await guest(requestId,'c'.repeat(64),'d'.repeat(64)),{total:String(before+1n)})
    await assert.rejects(guest('30000000-0000-4000-8000-000000000012'),/HEART_TOO_FAST/)
    await db.exec("update cares_guest_heart_requests set created_at=clock_timestamp()-interval '2 seconds'")
    assert.deepEqual(await guest('30000000-0000-4000-8000-000000000012'),{total:String(before+2n)})
    await assert.rejects(guest(requestId,'a'.repeat(64),'b'.repeat(64),'10000000-0000-4000-8000-000000000099'),/REQUEST_CONFLICT/)
    await assert.rejects(guest('30000000-0000-4000-8000-000000000014','a'.repeat(64),'b'.repeat(64),'10000000-0000-4000-8000-000000000099'),/LISTING_NOT_FOUND/)
    await db.exec(`insert into cares_guest_heart_requests(request_id,listing_id,visitor_hash,network_hash) select gen_random_uuid(),'${listing}',repeat('e',64),repeat('f',64) from generate_series(1,120)`)
    await assert.rejects(guest('30000000-0000-4000-8000-000000000013','9'.repeat(64),'f'.repeat(64)),/HEART_TOO_FAST/)
    await db.exec('set role anon')
    await assert.rejects(db.query('select * from cares_guest_heart_requests'),/permission denied/)
    await assert.rejects(guest(),/permission denied/)
    await db.exec('set role authenticated')
    await assert.rejects(db.query('select * from cares_guest_heart_requests'),/permission denied/)
    await assert.rejects(guest(),/permission denied/)
  })
  await db.close()
})
