const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript')
function load(file){const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>name.startsWith('.')?load(path.join(path.dirname(file),name+'.ts')):require(name),mod,mod.exports);return mod.exports}
const catalog=load('lib/service-types.ts'),{serviceTypes,serviceTypeGroups,serviceTypeValues,registrationServiceType}=catalog
const {rankingFilters}=load('lib/support-ranking.ts')
test('OSの40種別を登録・グループ・ランキングで欠落なく使える',()=>{
 assert.equal(serviceTypes.length,40);assert.equal(new Set(serviceTypes).size,40)
 assert.deepEqual(Object.values(serviceTypeGroups).flat(),[...serviceTypes])
 for(const type of serviceTypes){assert.equal(registrationServiceType(type),type);assert.equal(rankingFilters({service_type:type}).service,type)}
 for(const type of ['居宅療養管理指導','認知症対応型通所介護','住宅型有料老人ホーム','地域包括支援センター','特定福祉用具販売'])assert.ok(serviceTypes.includes(type))
})
test('既存の正式名・通称を両方向に検索し、異なるサービスは混ぜない',()=>{
 assert.deepEqual(serviceTypeValues('特養'),serviceTypeValues('介護老人福祉施設'))
 assert.deepEqual(serviceTypeValues('グループホーム'),serviceTypeValues('認知症対応型共同生活介護'))
 assert.ok(serviceTypeValues('通所介護').includes('デイサービス'))
 for(const [selected,excluded]of [['通所介護','地域密着型通所介護'],['通所介護','認知症対応型通所介護'],['通所介護','通所介護（療養通所介護）'],['有料老人ホーム','特定施設入居者生活介護（有料老人ホーム）'],['サービス付き高齢者向け住宅','特定施設入居者生活介護（サービス付き高齢者向け住宅）']])assert.equal(serviceTypeValues(selected).includes(excluded),false)
 assert.deepEqual(serviceTypeValues('特定施設入居者生活介護'),['特定施設入居者生活介護'])
})
test('登録値の空欄・未定義・不正な値を拒否し、既存の通称は受け付ける',()=>{
 for(const input of [undefined,null,{},123,'','未定義の種別','__proto__','constructor'])assert.equal(registrationServiceType(input),null)
 assert.equal(registrationServiceType('  デイサービス  '),'通所介護')
 assert.equal(registrationServiceType('特養'),'介護老人福祉施設')
 assert.equal(rankingFilters({service_type:'__proto__'}).service,'')
})
