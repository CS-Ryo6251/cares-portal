const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript')
function load(file){const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(name=>name.startsWith('.')?load(path.join(path.dirname(file),name+'.ts')):require(name),mod,mod.exports);return mod.exports}
const {applyDirectoryArea}=load('lib/directory-area.ts')
test('県名のない住所も登録済みの都道府県で検索できる',()=>{
 const rows=[{prefecture:'山形県',address:'山形市西田1丁目2-5'},{prefecture:'東京都',address:'東京都テスト市山形1'}]
 let result=rows;const calls=[]
 const query={eq:(key,value)=>{calls.push(['eq',key,value]);result=result.filter(row=>row[key]===value);return query},ilike:()=>{throw Error('県の検索で住所に依存しない')},or:()=>query}
 assert.equal(applyDirectoryArea(query,'山形県'),query);assert.deepEqual(result,[rows[0]]);assert.deepEqual(calls,[['eq','prefecture','山形県']])
})
test('市区町村は県内で検索し、市区町村欄のない住所も対象にする',()=>{
 const calls=[],query={eq:(...args)=>{calls.push(['eq',...args]);return query},ilike:(...args)=>{calls.push(['ilike',...args]);return query},or:(...args)=>{calls.push(['or',...args]);return query}}
 applyDirectoryArea(query,'山形県:山形市,天童市')
 assert.deepEqual(calls,[['eq','prefecture','山形県'],['or','city.eq."山形市",address.ilike."%山形市%",city.eq."天童市",address.ilike."%天童市%"']])
 calls.length=0;applyDirectoryArea(query,'山形県:');assert.deepEqual(calls,[['eq','prefecture','山形県']])
 calls.length=0;applyDirectoryArea(query,'山形市');assert.deepEqual(calls,[['ilike','address','%山形市%']])
 calls.length=0;applyDirectoryArea(query);assert.deepEqual(calls,[])
})
