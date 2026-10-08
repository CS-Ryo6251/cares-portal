const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),{PGlite}=require('@electric-sql/pglite'),{PDFDocument,PDFName}=require('pdf-lib')
function load(file,mocks={}){const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>Object.hasOwn(mocks,name)?mocks[name]:require(name),mod,mod.exports);return mod.exports}
const catalog=load('lib/brochures.ts'),intake=load('lib/intake.ts')
const security=load('lib/intake-server.ts',{'server-only':{},'next/headers':{},'./supabase':{},'./supabase-server-auth':{},'./intake':intake})
const helpers=load('lib/brochures-server.ts',{'server-only':{},'./supabase':{},'./supabase-server-auth':{},'./intake':intake,'./intake-server':security})
const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`
test('資料情報: 発行年月・タイトル・長さを検証し公開状態や投稿者の入力を無視',()=>{
 assert.deepEqual(catalog.brochureMetadata({title:' 案内 ',note:' 配布資料 ',issuedMonth:'2025-09',user_id:id(9),status:'published'}),{title:'案内',note:'配布資料',issued_month:'2025-09'})
 for(const issuedMonth of ['2025-13','9999-01','1899-01','2025-1',null])assert.throws(()=>catalog.brochureMetadata({title:'案内',note:'',issuedMonth}))
 assert.equal(catalog.brochureMetadata({title:'案内',note:'',issuedMonth:''}).issued_month,null)
 for(const title of ['',{},'あ'.repeat(101)])assert.throws(()=>catalog.brochureMetadata({title,note:'',issuedMonth:''}))
})
test('資料内容: 拡張子に頼らずPDFを解析し、破損・JavaScript・入れ子のアクションを拒否',async()=>{
 const pdf=await PDFDocument.create();pdf.addPage()
 assert.equal(await helpers.validateBrochureFile(await pdf.save()),'application/pdf')
 await assert.rejects(helpers.validateBrochureFile(Buffer.from('<svg onload="alert(1)"/>')),/PDF/)
 await assert.rejects(helpers.validateBrochureFile(Buffer.from('%PDF-not-a-real-document')),/共有できません/)
 pdf.getPage(0).node.set(PDFName.of('Annots'),pdf.context.obj([{A:{S:'JavaScript',JS:'alert(1)'}}]))
 await assert.rejects(helpers.validateBrochureFile(await pdf.save()),/共有できません/)
})
test('DB: 公開・本人管理・保存・役立ち・報告・ページング・ストレージ境界',async t=>{
 const db=new PGlite()
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
  grant usage on schema public,auth,storage to anon,authenticated,service_role;
  create table auth.users(id uuid primary key);create table cares_listings(id uuid primary key,facility_name text,owner_facility_id uuid,is_owner_verified boolean default false);
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(),bucket_id text);alter table storage.objects enable row level security;
  create policy legacy_open on storage.objects for all to anon,authenticated using(true) with check(true);
  grant all on all tables in schema public,auth,storage to service_role;grant all on storage.objects to anon,authenticated;`)
  const file=fs.readdirSync(path.join(__dirname,'../supabase/migrations')).find(name=>name.endsWith('_cares_community_brochures.sql'))
  await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations',file),'utf8'))
  const scope=fs.readdirSync(path.join(__dirname,'../supabase/migrations')).find(name=>name.endsWith('_cares_brochure_verified_scope.sql'))
  await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations',scope),'utf8'))
  await db.query('insert into cares_listings(id,facility_name) values($1,$2),($3,$4)',[id(1),'合成事業所A',id(2),'合成事業所B'])
  for(let n=10;n<=14;n++)await db.query('insert into auth.users values($1)',[id(n)])
  async function add(n,listing=1,author=10,status='published'){
   await db.query('insert into cares_brochures(id,listing_id,user_id,title,files,request_hash,status) values($1,$2,$3,$4,$5,$6,$7)',[id(n),id(listing),id(author),'合成資料'+n,JSON.stringify([{path:id(n)+'/0.pdf',mime:'application/pdf',size:100}]),'hash',status])
  }
  await add(100);await add(101,2);await add(102,1,11);await add(103,1,10,'uploading');await add(104,1,10,'hidden');await add(105,1,10,'deleted')
  const list=async(mode='public',user=null,listing=id(1),offset=0)=>(await db.query('select cares_brochure_list($1,$2,$3,null,$4) as value',[listing,user,mode,offset])).rows[0].value
  const action=(brochure,user,kind='helpful',enabled=true)=>db.query('select cares_brochure_action($1,$2,$3,$4)',[id(brochure),id(user),kind,enabled])
  await t.test('匿名・認証済ユーザーは作者ID・保存履歴・ファイルパスを直接取得できない',async()=>{
   for(const role of ['anon','authenticated']){
    await db.exec(`set role ${role}`)
    for(const table of ['cares_brochures','cares_brochure_actions','cares_brochure_reports'])await assert.rejects(db.query('select * from '+table),/permission denied/)
    await assert.rejects(list(),/permission denied/)
    await assert.rejects(db.query("insert into storage.objects(bucket_id) values('cares-brochures')"),/row-level security/)
    await db.query("insert into storage.objects(bucket_id) values('unrelated-bucket')")
   }
   await db.exec('set role service_role')
  })
  await t.test('公開一覧は対象事業所のみ、未完了・非公開・削除資料と個人情報を出さない',async()=>{
   const rows=(await list()).items
   assert.deepEqual(rows.map(row=>row.id).sort(),[id(100),id(102)])
   assert.equal(JSON.stringify(rows).includes('path'),false);assert.equal(JSON.stringify(rows).includes(id(10)),false)
   assert.equal(rows[0].mine,false)
  })
  await t.test('公式ページに紐付けた後も旧掲載への資料が残り、未確認・別事業所は混ぜない',async()=>{
   await db.query('update cares_listings set owner_facility_id=$1 where id in ($2,$3)',[id(99),id(1),id(2)])
   assert.equal((await list()).items.length,2)
   await db.query('update cares_listings set is_owner_verified=true where id=$1',[id(1)])
   assert.equal((await list()).items.length,2)
   await db.query('update cares_listings set is_owner_verified=true where id=$1',[id(2)])
   assert.equal((await list()).items.length,3)
   assert.equal((await list('public',null,id(2))).items.length,3)
   await db.query('update cares_listings set owner_facility_id=$1 where id=$2',[id(98),id(2)])
   assert.equal((await list()).items.length,2)
   await db.exec('update cares_listings set owner_facility_id=null,is_owner_verified=false')
  })
  await t.test('二重送信しても役に立ったは1人1票、自分には投票できない',async()=>{
   await Promise.all([action(100,11),action(100,11)])
   assert.equal((await list()).items.find(row=>row.id===id(100)).helpfulCount,1)
   await assert.rejects(action(100,10),/Own brochure/)
   await action(100,11,'helpful',false);await action(100,11,'helpful',false)
   assert.equal((await list()).items.find(row=>row.id===id(100)).helpfulCount,0)
  })
  await t.test('保存一覧・自分の資料・集計は本人に限定、私的な保存先を公開しない',async()=>{
   await action(100,11,'saved');await action(100,11);await action(101,12,'saved')
   assert.deepEqual((await list('saved',id(11),null)).items.map(row=>row.id),[id(100)])
   const own=await list('shared',id(10),null)
   assert.equal(own.items.length,4);assert.ok(own.items.every(row=>row.mine));assert.equal(own.summary.helpful,1)
   assert.equal((await list('shared',id(11),null)).items.length,1)
   await assert.rejects(list('shared',null,null),/Invalid/)
  })
  await t.test('報告は重複加算せず異なる3人で非公開、非公開後の保存・投票も拒否',async()=>{
   const report=user=>db.query('select cares_brochure_report($1,$2,$3)',[id(100),id(user),'合成の確認報告'])
   await report(11);await report(11);assert.ok((await list()).items.some(row=>row.id===id(100)))
   await report(12);await report(13)
   assert.equal((await list()).items.some(row=>row.id===id(100)),false)
   assert.equal((await list('saved',id(11),null)).items.length,0)
   await assert.rejects(action(100,14),/unavailable/)
   assert.equal((await list('shared',id(10),null)).items.find(row=>row.id===id(100)).status,'hidden')
  })
  await t.test('20件を超えてもページ送りで欠落せず、他事業所を混ぜない',async()=>{
   for(let n=200;n<224;n++)await add(n)
   const first=await list(),second=await list('public',null,id(1),20)
   assert.equal(first.items.length,20);assert.equal(first.hasMore,true);assert.equal(second.items.length,5);assert.equal(second.hasMore,false)
   assert.equal(new Set([...first.items,...second.items].map(row=>row.id)).size,25)
  })
 }finally{await db.close()}
})

function apiHarness(){
 let user=id(10),uploads=0,removed=0,failUpload=false
 const rows=new Map()
 function from(table){
  const filters=[];let operation='select',values
  const builder={select(){return this},insert(v){operation='insert';values=v;return this},update(v){operation='update';values=v;return this},eq(k,v){filters.push([k,v]);return this},order(){return this},limit(){return this},maybeSingle(){return execute(true)},single(){return execute(true)},then(resolve,reject){return execute(false).then(resolve,reject)}}
  async function execute(single){
   if(table==='cares_listings')return {data:{id:id(1),is_owner_verified:false},error:null}
   if(operation==='insert'){if(rows.has(values.id))return {data:null,error:{code:'23505'}};rows.set(values.id,{...values,status:'uploading'});return {data:null,error:null}}
   const found=[...rows.values()].filter(row=>filters.every(([key,value])=>row[key]===value))
   if(operation==='update')found.forEach(row=>Object.assign(row,values))
   return {data:single?found[0]||null:found,error:null}
  }return builder
 }
 const db={from,storage:{from:()=>({upload:async()=>{uploads++;return {error:failUpload?{message:'synthetic failure'}:null}},remove:async()=>{removed++;return {error:null}},createSignedUrl:async()=>({data:{signedUrl:'https://storage.example/signed'},error:null})})}}
 const safe={...security,takeLimit:async()=>{},networkKey:()=> 'test-network'}
 const server=load('lib/brochures-server.ts',{'server-only':{},'./supabase':{getSupabaseServiceClient:()=>db},'./supabase-server-auth':{createAuthServerClient:async()=>({auth:{getUser:async()=>({data:{user:user?{id:user}:null},error:null})}})},'./intake':intake,'./intake-server':safe})
 const mocks={'@/lib/brochures':catalog,'@/lib/brochures-server':server,'@/lib/intake':intake,'@/lib/intake-server':safe,'@/lib/supabase':{getSupabaseServiceClient:()=>db}}
 return {rows,setUser:value=>{user=value},setUploadFailure:value=>{failUpload=value},uploads:()=>uploads,removed:()=>removed,route:load('app/api/brochures/route.ts',mocks),item:load('app/api/brochures/[id]/route.ts',mocks),file:load('app/api/brochures/[id]/file/route.ts',mocks)}
}
async function uploadRequest(n=100,{origin='https://cares.example',consent='true',bytes}={}){
 const pdf=await PDFDocument.create();pdf.addPage()
 const form=new FormData();for(const [key,value]of Object.entries({id:id(n),listing:id(1),title:'合成パンフレット',note:'',issuedMonth:'',consent}))form.set(key,value)
 form.append('files',new File([bytes||await pdf.save({useObjectStreams:false})],'private-name.pdf',{type:'application/pdf'}))
 return new Request('https://cares.example/api/brochures',{method:'POST',headers:{origin},body:form})
}
const context=n=>({params:Promise.resolve({id:id(n)})})
test('アップロードAPI: 認証・Origin・同意・ファイル内容・サイズを保存前に検証',async()=>{
 const h=apiHarness();h.setUser(null)
 assert.equal((await h.route.POST(await uploadRequest())).status,401);h.setUser(id(10))
 assert.equal((await h.route.POST(await uploadRequest(100,{origin:'https://evil.example'}))).status,403)
 assert.equal((await h.route.POST(await uploadRequest(100,{consent:'false'}))).status,400)
 assert.equal((await h.route.POST(await uploadRequest(100,{bytes:Buffer.from('<svg/>')}))).status,400)
 assert.equal((await h.route.POST(await uploadRequest(100,{bytes:Buffer.alloc(catalog.BROCHURE_MAX_BYTES+1)}))).status,413)
 assert.equal(h.uploads(),0);assert.equal(h.rows.size,0)
})
test('アップロードAPI: タイムアウト後に再試行でき、重複公開せず、他人のIDでは上書きしない',async()=>{
 const h=apiHarness(),pdf=await PDFDocument.create();pdf.addPage();const bytes=await pdf.save()
 h.setUploadFailure(true);assert.equal((await h.route.POST(await uploadRequest(100,{bytes}))).status,503)
 assert.equal(h.rows.get(id(100)).status,'uploading')
 h.setUploadFailure(false);assert.equal((await h.route.POST(await uploadRequest(100,{bytes}))).status,201)
 assert.equal((await h.route.POST(await uploadRequest(100,{bytes}))).status,200);assert.equal(h.rows.size,1);assert.equal(h.uploads(),2)
 h.setUser(id(11));assert.equal((await h.route.POST(await uploadRequest(100,{bytes}))).status,409);assert.equal(h.uploads(),2)
})
test('管理API: 他人の資料は編集・削除不可、削除後はファイルURLを発行しない',async()=>{
 const h=apiHarness();await h.route.POST(await uploadRequest())
 const request=(method,body)=>new Request('https://cares.example/api/brochures/'+id(100),{method,headers:{origin:'https://cares.example','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})})
 h.setUser(id(11));assert.equal((await h.item.DELETE(request('DELETE'),context(100))).status,403)
 assert.equal((await h.item.PATCH(request('PATCH',{action:'edit',title:'書換え',note:'',issuedMonth:''}),context(100))).status,403)
 assert.equal(h.removed(),0);assert.equal(h.rows.get(id(100)).title,'合成パンフレット')
 h.setUser(id(10));assert.equal((await h.item.DELETE(request('DELETE'),context(100))).status,200);assert.equal(h.rows.get(id(100)).status,'deleted')
 assert.equal((await h.file.GET(new Request('https://cares.example/api/brochures/'+id(100)+'/file'),context(100))).status,404)
 assert.equal((await h.route.POST(await uploadRequest())).status,409)
})
