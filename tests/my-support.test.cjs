const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const { PGlite } = require('@electric-sql/pglite')
const { NextRequest } = require('next/server')
const root = path.join(__dirname, '..')
const migration = 'supabase/migrations/20261007133808_cares_my_support_history.sql'
const u1 = '10000000-0000-4000-8000-000000000001', u2 = '10000000-0000-4000-8000-000000000002', u3 = '10000000-0000-4000-8000-000000000003'
const l1 = '20000000-0000-4000-8000-000000000001', l2 = '20000000-0000-4000-8000-000000000002'
const id = n => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`
function load(file, mocks = {}) {
  const mod = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  new Function('require', 'module', 'exports', code)(name => mocks[name] || (name.startsWith('@/lib/') ? load(`lib/${name.slice(6)}.ts`, mocks) : require(name)), mod, mod.exports)
  return mod.exports
}

test('実PostgreSQL: 本人の応援履歴・匿名の維持・原子的な加算・RLS・JST集計', async t => {
  const db = new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      create table cares_listings(id uuid primary key,facility_name text,service_type text,address text);
      grant select on cares_listings to anon,authenticated; grant all on cares_listings to service_role;
      insert into auth.users values('${u1}'),('${u2}'),('${u3}');
      insert into cares_listings values('${l1}','ひだまり（合成）','day_service','合成市'),('${l2}','こもれび（合成）','home_care','合成市');`)
    const warm = fs.readFileSync(path.join(root, 'supabase/migrations/20261007022927_cares_warm_directory.sql'), 'utf8').split('alter table public.cares_vacancy_reports')[0]
    await db.exec(warm + 'commit;')
    await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations/20261007041342_cares_guest_hearts.sql'), 'utf8'))
    await db.exec(fs.readFileSync(path.join(root, migration), 'utf8'))
    const send = async (n, user, listing = l1, visitor = String(n).padStart(64, 'a')) => (await db.query('select cares_send_support_heart($1,$2,$3,$4,$5) as data', [listing,id(n),visitor,'b'.repeat(64),user])).rows[0].data
    const asUser = async user => db.exec(`reset role; set request.jwt.claim.sub='${user}'; set role authenticated;`)
    const summary = async period => (await db.query('select cares_my_support($1) as data', [period])).rows[0].data

    await t.test('本人に紐づく送信と再送は1回だけ加算', async () => {
      await db.exec('set role service_role')
      assert.deepEqual(await send(1, u1), { total: '1', recorded: true })
      assert.deepEqual(await send(1, u1), { total: '1', recorded: true })
      await assert.rejects(send(1, u2), /REQUEST_OWNER_CHANGED/)
      await assert.rejects(send(1, null), /REQUEST_OWNER_CHANGED/)
      await assert.rejects(send(1, u1, l2), /REQUEST_CONFLICT/)
      await assert.rejects(send(11, u1, l1, String(1).padStart(64,'a')), /HEART_TOO_FAST/)
    })
    await t.test('登録前の匿名応援はログイン後に再送しても取り込まない', async () => {
      assert.deepEqual(await send(2, null), { total: '2', recorded: false })
      assert.deepEqual(await send(2, u1), { total: '2', recorded: false })
      assert.equal((await db.query('select user_id from cares_guest_heart_requests where request_id=$1',[id(2)])).rows[0].user_id,null)
    })
    await t.test('履歴の保存に失敗したらハートの加算も残らない', async () => {
      await assert.rejects(send(3,'10000000-0000-4000-8000-000000000099'), /foreign key/)
      assert.equal((await db.query('select count(*)::int as count from cares_guest_heart_requests where request_id=$1',[id(3)])).rows[0].count,0)
      assert.equal((await db.query('select total::text from cares_listing_heart_totals where listing_id=$1',[l1])).rows[0].total,'2')
      await send(4,u2,l2)
    })
    await t.test('自分以外・訪問者ハッシュ・直接更新・匿名アクセスは拒否', async () => {
      await asUser(u1)
      assert.deepEqual((await db.query('select request_id,user_id from cares_guest_heart_requests')).rows,[{request_id:id(1),user_id:u1}])
      await assert.rejects(db.query('select visitor_hash from cares_guest_heart_requests'),/permission denied/)
      await assert.rejects(db.query(`update cares_guest_heart_requests set user_id='${u2}'`),/permission denied/)
      await assert.rejects(send(5,u2),/permission denied/)
      assert.equal((await summary('all')).total,'1')
      await asUser(u2); assert.equal((await summary('all')).total,'1')
      await db.exec('reset role; set role anon')
      await assert.rejects(summary('all'),/permission denied/)
      await assert.rejects(db.query('select request_id from cares_guest_heart_requests'),/permission denied/)
    })
    await t.test('日本時間の30日境界、旧会員履歴、1000件を超える正確な集計', async () => {
      await db.exec(`reset role;
        insert into cares_guest_heart_requests(request_id,listing_id,visitor_hash,network_hash,user_id,created_at)
        select gen_random_uuid(),'${l1}',repeat('c',64),repeat('d',64),'${u1}',clock_timestamp()-interval '2 hours' from generate_series(1,1100);
        insert into cares_guest_heart_requests values('${id(6)}','${l2}',repeat('e',64),repeat('f',64),((now() at time zone 'Asia/Tokyo')::date-29)::timestamp at time zone 'Asia/Tokyo','${u1}');
        insert into cares_guest_heart_requests values('${id(7)}','${l2}',repeat('e',64),repeat('f',64),(((now() at time zone 'Asia/Tokyo')::date-29)::timestamp at time zone 'Asia/Tokyo')-interval '1 second','${u1}');
        insert into cares_listing_heart_requests values('${u1}','${id(8)}','${l2}',now()-interval '100 days');`)
      await asUser(u1)
      const data=await summary('30d')
      assert.equal(data.total,'1102'); assert.equal(data.lifetimeTotal,'1104'); assert.equal(data.facilityCount,2)
      assert.equal(data.timeline.length,30); assert.equal(data.timeline[0].count,'1')
      assert.equal(data.timeline.reduce((n,d)=>n+Number(d.count),0),1102)
      assert.equal(data.facilities.reduce((n,f)=>n+Number(f.count),0),1102)
      assert.equal(data.recent.length,20); assert.equal(data.facilities[0].count,'1101')
      assert.equal((await summary('90d')).total,'1103')
      const all=await summary('all'); assert.equal(all.total,'1104'); assert.equal(all.unit,'month')
      assert.equal(all.timeline.reduce((n,d)=>n+Number(d.count),0),1104)
      assert.ok(!JSON.stringify(data).includes('visitor_hash')); assert.ok(!JSON.stringify(data).includes(u2))
      await assert.rejects(summary('bad'), /INVALID_PERIOD/)
    })
    await t.test('未活動の会員は0件と30日分のゼロ。DB障害とは区別する',async()=>{
      await asUser(u3);const data=await summary('30d')
      assert.equal(data.total,'0');assert.equal(data.facilityCount,0);assert.equal(data.timeline.length,30);assert.deepEqual(data.facilities,[])
    })
  } finally { await db.close() }
})

test('API: 履歴は認証済み本人だけ、取得エラーを0件にしない',async()=>{
  let user={id:u1}, failure=false, params, called=0
  const route=load('app/api/my-actions/support/route.ts',{'@/lib/supabase-server-auth':{createAuthServerClient:async()=>({auth:{getUser:async()=>({data:{user}})},rpc:async(name,p)=>{called++;params=p;return failure?{error:{message:'outage'}}:{data:{total:'12'}}}})}})
  const request=period=>new NextRequest(`https://cares.test/api/my-actions/support?period=${period}&user_id=${u2}`)
  const res=await route.GET(request('90d'));assert.equal(res.status,200);assert.deepEqual(params,{p_period:'90d'});assert.equal(res.headers.get('cache-control'),'private, no-store')
  assert.equal((await route.GET(request('wrong'))).status,400);assert.equal(called,1)
  user=null;assert.equal((await route.GET(request('all'))).status,401);assert.equal(called,1)
  user={id:u1};failure=true;assert.equal((await route.GET(request('all'))).status,503)
})

test('API: ハートの利用者IDはAuthだけから採用し、認証障害で匿名に降格しない',async()=>{
  let user={id:u1},authError=null,sent,called=0
  const route=load('app/api/directory/[id]/hearts/route.ts',{
    '@/lib/supabase-server-auth':{createAuthServerClient:async()=>({auth:{getUser:async()=>({data:{user},error:authError})}})},
    '@/lib/heart-visitor':{heartVisitor:()=>({visitorHash:'a'.repeat(64),networkHash:'b'.repeat(64)}),setHeartVisitor:r=>r},
    '@/lib/supabase':{getSupabaseServiceClient:()=>({rpc:async(name,p)=>{called++;sent={name,p};return{data:{recorded:Boolean(p.p_user_id)}}}})},
    '@/lib/hearts':{getHeartSummaries:async()=>({[l1]:{total:'12'}})},
  })
  const request=()=>new NextRequest(`https://cares.test/api/directory/${l1}/hearts`,{method:'POST',headers:{origin:'https://cares.test','content-type':'application/json'},body:JSON.stringify({request_id:id(1),user_id:u2})})
  const options={params:Promise.resolve({id:l1})}
  let res=await route.POST(request(),options);assert.equal(res.status,200);assert.equal(sent.p.p_user_id,u1);assert.equal(sent.name,'cares_send_support_heart');assert.equal((await res.json()).recorded,true)
  user=null;authError={name:'AuthSessionMissingError'};res=await route.POST(request(),options);assert.equal(res.status,200);assert.equal(sent.p.p_user_id,null)
  authError={name:'AuthRetryableFetchError'};assert.equal((await route.POST(request(),options)).status,503);assert.equal(called,2)
})

test('グラフの比率は大きい数・ゼロでも正確に描ける',()=>{
  const {supportPercent}=load('lib/my-support.ts')
  assert.equal(supportPercent('0','0'),0);assert.equal(supportPercent('50000000000000000000','100000000000000000000'),50)
})
