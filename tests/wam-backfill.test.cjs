const {test}=require('node:test'),assert=require('node:assert/strict')
const {parseOptions,runBackfill,repository}=require('../scripts/backfill-wam-listings.cjs')
const id=n=>`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`
function fixture(count=5){
 let active={id:id(99),version:'2026-09'},saved=null,fail=null,changeAfter=false
 const entries=Array.from({length:count},(_,i)=>({id:id(i+1),service_type:i%2?'短期入所（障害福祉）':'生活介護'})),listings=[],calls=[]
 const repo={activeSnapshot:async()=>({...active}),count:async()=>entries.length,page:async(snapshot,cursor,size)=>entries.filter(e=>!cursor||e.id>cursor).slice(0,size),listings:async ids=>listings.filter(l=>ids.includes(l.source_entry_id)),ensure:async entry=>{
  calls.push(entry.id)
  if(!listings.some(l=>l.source_entry_id===entry.id))listings.push({id:id(200+listings.length),source_entry_id:entry.id,source_version:entry.source_version,service_type:entry.service_type})
  if(changeAfter)active={id:id(98),version:'2026-10'}
  if(fail===entry.id){fail=null;throw new Error('synthetic lost response')}
 }}
 const store={read:async()=>saved&&structuredClone(saved),write:async v=>{saved=structuredClone(v)}}
 const options=(more=[])=>parseOptions(['--apply','--snapshot',id(99),'--checkpoint','synthetic-checkpoint.json',...more])
 return{repo,store,options,entries,listings,calls,get saved(){return saved},failAt(value){fail=value},changeAfterWrite(){changeAfter=true}}
}
test('WAM backfillはdry-run既定・明示apply/snapshot/checkpoint・上限を検証',()=>{
 assert.equal(parseOptions([]).apply,false);assert.equal(parseOptions([]).limit,1000)
 for(const args of [['--apply'],['--resume'],['--limit','0'],['--limit','100001'],['--page-size','201'],['--snapshot','not-a-uuid']])assert.throws(()=>parseOptions(args))
})
test('dry-runはページング/件数上限だけ確認しRPCとcheckpoint書込を行わない',async()=>{
 const f=fixture();const result=await runBackfill(f.repo,parseOptions(['--limit','2','--page-size','1']),f.store)
 assert.equal(result.mode,'dry-run');assert.equal(result.processedThisRun,2);assert.equal(result.completed,false);assert.equal(result.newListingCandidates,2)
 assert.deepEqual(f.calls,[]);assert.equal(f.saved,null)
})
test('同じactive snapshot内だけ再開し、処理済み行を重複作成しない',async()=>{
 const f=fixture();await runBackfill(f.repo,f.options(['--limit','2','--page-size','1']),f.store)
 assert.equal(f.saved.lastEntryId,id(2));assert.equal(f.saved.complete,false)
 const result=await runBackfill(f.repo,f.options(['--resume','--limit','10','--page-size','2']),f.store)
 assert.equal(result.processedThisRun,3);assert.equal(result.completed,true);assert.equal(f.listings.length,5)
 assert.deepEqual(f.calls,[id(1),id(2),id(3),id(4),id(5)])
 const done=await runBackfill(f.repo,f.options(['--resume']),f.store);assert.equal(done.processedThisRun,0)
 await assert.rejects(runBackfill(f.repo,f.options(),f.store),/Checkpoint already exists/)
})
test('RPC成功後の応答紛失はcursorを進めず、source identityで安全に再試行する',async()=>{
 const f=fixture(3);f.failAt(id(1))
 await assert.rejects(runBackfill(f.repo,f.options(),f.store),/lost response/)
 assert.equal(f.saved.lastEntryId,null);assert.equal(f.listings.length,1)
 await runBackfill(f.repo,f.options(['--resume']),f.store)
 assert.equal(f.listings.length,3);assert.deepEqual(f.calls,[id(1),id(1),id(2),id(3)])
})
test('snapshot切替・サービス不一致・版不一致は停止し、名前や番号で自動マージしない',async()=>{
 const switched=fixture();switched.changeAfterWrite()
 await assert.rejects(runBackfill(switched.repo,switched.options(),switched.store),/snapshot changed/)
 assert.equal(switched.saved.lastEntryId,null)
 await assert.rejects(runBackfill(switched.repo,switched.options(['--resume']),switched.store),/not active/)
 for(const change of [{service_type:'通所介護',source_version:'2026-09'},{service_type:'生活介護',source_version:'old'}]){
  const f=fixture();f.listings.push({id:id(88),source_entry_id:id(1),...change})
  await assert.rejects(runBackfill(f.repo,f.options(),f.store),/mapping conflict/);assert.deepEqual(f.calls,[])
 }
})

test('新版source aliasのcanonical URL引継ぎを受理し、別target/サービスは拒否',async()=>{
 const entry={id:id(3),service_type:'生活介護',source_version:'2026-10'}
 let aliasTarget=id(10),listingService='生活介護'
 const client={rpc:async()=>({data:id(10),error:null}),from:table=>{
  const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({error:null,data:table==='service_availability_target_aliases'?{target_id:aliasTarget}:table==='service_availability_targets'?{id:id(10),listing_id:id(20),service_type:'生活介護'}:{id:id(20),service_type:listingService,source_entry_id:id(1),source_version:'2026-09'}})};return q
 }}
 const repo=repository(client)
 await repo.ensure(entry)
 aliasTarget=id(11);await assert.rejects(repo.ensure(entry),/source\/service verification/)
 aliasTarget=id(10);listingService='通所介護';await assert.rejects(repo.ensure(entry),/canonical listing verification/)
})
