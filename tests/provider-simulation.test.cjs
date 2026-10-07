const { test } = require('node:test')
const assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript')
const catalog = require('../data/provider-simulation-catalog.json')
function load(file, mocks = {}) {
 const m = {exports:{}}
 const code = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText
 new Function('require','module','exports',code)(name => mocks[name] || require(name),m,m.exports)
 return m.exports
}
const settings = load('lib/provider-simulation-settings.ts', {'@/data/provider-simulation-catalog.json':catalog})
const valid = {revision:'2026-06', service_type:'通所介護', group:'通常規模型', area:'other', addons:{},effective_from:'2026-10',effective_to:'2027-03'}
test('事業所の届出条件はサービス別に検証し、未確認をゼロや通常規模と同一視しない',()=>{
 assert.deepEqual(settings.readProviderSettings(valid,'通所介護'),valid)
 assert.equal(settings.readProviderSettings({...valid,group:null,area:null},'通所介護').group,null)
 for(const patch of [{service_type:'訪問介護'},{group:'病院・診療所'},{area:'8'},{revision:'2024-04'},{effective_from:'2026-05'},{effective_to:'2026-09'},{effective_to:'2027-04'},{addons:{処遇改善:'116275'}},{addons:{架空:'none'}}])
  assert.equal(settings.readProviderSettings({...valid,...patch},'通所介護'),null,JSON.stringify(patch))
 for(const service of ['__proto__','toString','不明']) assert.equal(settings.providerService(service),undefined)
 assert.equal(settings.applicableProviderSettings(valid,'通所介護','2026-09'),null)
 assert.ok(settings.applicableProviderSettings(valid,'通所介護','2026-10'))
 assert.equal(settings.applicableProviderSettings(valid,'通所介護','2027-04'),null)
 const visiting={...valid,service_type:'訪問介護',group:null}
 assert.ok(settings.readProviderSettings(visiting,'訪問介護'))
 assert.equal(settings.readProviderSettings({...visiting,group:'身体介護'},'訪問介護'),null)
})
test('登録用の区分と加算は公開シミュレーションの単価表に全て存在する',()=>{
 const rows=require('../data/simulation-tariffs-2026-06.json').rows
 for(const [name,s] of Object.entries(catalog.services)){
  const source=rows.filter(t=>t.code.startsWith(s.prefix))
  assert.deepEqual(s.groups,[...new Set(source.filter(t=>!t.addonGroup).map(t=>t.group))],name)
  for(const addon of s.addons){const t=source.find(t=>t.code===addon.code);assert.equal(t.addonGroup,addon.group);assert.equal(t.name,addon.name);assert.equal(t.rate,addon.rate)}
 }
})
test('公開画面は事業所条件を表示し、訪問介護だけ利用するサービスを選択できる',()=>{
 const React=require('react'), {renderToStaticMarkup}=require('react-dom/server')
 const C=load('app/facility/[id]/FeeSimulator.tsx',{'@/lib/fee-calculation':load('lib/fee-calculation.ts'),'@/lib/provider-simulation-settings':settings}).default
 const rows=require('../data/simulation-tariffs-2026-06.json').rows
 const render=(service_type,prefix,group)=>renderToStaticMarkup(React.createElement(C,{fees:[],tariffs:rows.filter(t=>t.code.startsWith(prefix)),serviceType:service_type,providerSettings:{...valid,service_type,group,effective_from:'2026-06'}}))
 const html=render('通所介護','15','通常規模型')
 assert.match(html,/この事業所の料金計算条件/)
 assert.doesNotMatch(html,/利用するサービス内容/)
 assert.match(render('訪問介護','11',null),/利用するサービス内容/)
})
