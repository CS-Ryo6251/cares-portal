const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server')
function load(file,deps={}){const mod={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;new Function('require','module','exports',code)(n=>n in deps?deps[n]:require(n),mod,mod.exports);return mod.exports}
const listing='10000000-0000-4000-8000-000000000001'
const nav=load('lib/cares-navigation.ts')
const Consultation=load('components/ProfessionalConsultation.tsx',{'@/lib/cares-navigation':nav}).default
const render=availability=>renderToStaticMarkup(React.createElement(Consultation,{listingId:listing,facilityName:'合成生活介護',availability}))
test('介護と障害福祉の公開募集を、同じ掲載先を保持してOSの登録・ログインに接続する',()=>{
 const html=render({published:true,recruitment_status:'active',recruitment_post_id:'post',status:'has_vacancy'})
 assert.match(html,/合成生活介護への相談/)
 const urls=[...html.matchAll(/href="([^"]+)"/g)].map(m=>new URL(m[1].replaceAll('&amp;','&')))
 assert.equal(urls.length,2);for(const url of urls){assert.equal(url.origin,'https://app.carespace.jp');assert.equal(url.pathname,'/api/services/availability/entry');assert.equal(url.searchParams.get('listing_id'),listing)}
 assert.equal(urls[0].searchParams.get('mode'),'signup');assert.equal(urls[1].searchParams.get('mode'),'login')
})
test('募集なし・終了・非公開・空きなしは当該事業所への相談を約束しない',()=>{
 for(const state of [null,{published:false},{published:true,recruitment_status:'closed'},{published:true,recruitment_status:'active',recruitment_post_id:'post',status:'no_vacancy'}]){const html=render(state);assert.doesNotMatch(html,/availability\/entry|この事業所に相談する/);assert.match(html,/signup\?source=cares/)}
})
test('Cares登録は業界関係者のOS登録に一本化し家族には公開閲覧を案内する',()=>{
 const Signup=load('app/signup/page.tsx',{'next/link':({children,...props})=>React.createElement('a',props,children)}).default
 const html=renderToStaticMarkup(React.createElement(Signup));assert.doesNotMatch(html,/<form|type="password"/);assert.match(html,/app.carespace.jp\/signup/);assert.match(html,/業界関係者/);assert.match(html,/ご本人・ご家族/)
})
