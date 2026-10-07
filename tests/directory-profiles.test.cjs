const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
test('検索カードは確認済み事業所の公開カバーだけを一括取得し、未公開・未確認を使わない',async()=>{
 const calls=[],profile={facility_id:'facility-a',cover_image_url:'https://example.invalid/public.jpg',overview:'公開紹介'}
 let fail=false
 const query={select:value=>{calls.push(['select',value]);return query},in:(key,values)=>{calls.push(['in',key,values]);return query},eq:async(key,value)=>{calls.push(['eq',key,value]);return {data:fail?null:[profile],error:fail?{message:'private detail'}:null}}}
 const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync('lib/directory-profiles.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(()=>({getSupabaseClient:()=>({from:table=>{assert.equal(table,'facility_portal_profiles');return query}})}),mod,mod.exports)
 const {getDirectoryProfiles,directoryProfile}=mod.exports
 const verified={owner_facility_id:'facility-a',is_owner_verified:true},unverified={owner_facility_id:'facility-a',is_owner_verified:false}
 const profiles=await getDirectoryProfiles([verified,verified,unverified,{owner_facility_id:'untrusted',is_owner_verified:false}])
 assert.deepEqual(calls,[['select','facility_id,cover_image_url,overview'],['in','facility_id',['facility-a']],['eq','is_published',true]])
 assert.equal(directoryProfile(verified,profiles).cover_image_url,profile.cover_image_url)
 assert.equal(directoryProfile(unverified,profiles),undefined)
 assert.equal(directoryProfile({owner_facility_id:'private-profile',is_owner_verified:true},profiles),undefined)
 calls.length=0;assert.deepEqual(await getDirectoryProfiles([unverified]),{});assert.equal(calls.length,0)
 fail=true;assert.deepEqual(await getDirectoryProfiles([verified]),{})
})
