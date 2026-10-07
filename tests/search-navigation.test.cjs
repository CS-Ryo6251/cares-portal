const {test}=require('node:test'),assert=require('node:assert/strict'),ts=require('typescript'),fs=require('node:fs')
const mod={exports:{}}
new Function('module','exports',ts.transpileModule(fs.readFileSync('lib/search-navigation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(mod,mod.exports)
const {unifiedSearchUrl}=mod.exports
test('旧一覧のブックマークは検索条件を保持してホームの施設検索に統一',()=>{
 assert.equal(unifiedSearchUrl({}),'/')
 const url=new URL(unifiedSearchUrl({q:'笑顔 & 庭',prefecture:'山形県',service_type:'通所介護',page:'2',view:'posts',redirect:'https://example.invalid'}),'https://cares.example')
 assert.equal(url.pathname,'/');assert.equal(url.searchParams.get('q'),'笑顔 & 庭');assert.equal(url.searchParams.get('area'),'山形県');assert.equal(url.searchParams.get('service_type'),'通所介護');assert.equal(url.searchParams.get('page'),'2');assert.equal(url.searchParams.has('view'),false);assert.equal(url.searchParams.has('redirect'),false)
 assert.equal(new URL(unifiedSearchUrl({q:['一つ目','二つ目'],area:'東京都:新宿区',prefecture:'山形県'}),'https://cares.example').searchParams.get('area'),'東京都:新宿区')
})
