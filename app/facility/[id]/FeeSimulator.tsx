'use client'

import { useId, useState } from 'react'
import { Calculator, Plus, Trash2, Copy, Info } from 'lucide-react'
import { amountRange, billingLabels, careLimits, formatYen, frequencyCount, insuranceEstimate, providerFeeTotal, unitPrice } from '@/lib/fee-calculation'
import type { Fee, Tariff } from '@/lib/fee-calculation'
import { applicableProviderSettings, providerService, readProviderSettings, regionLabel } from '@/lib/provider-simulation-settings'

const source = 'https://www.wam.go.jp/gyoseiShiryou/detail?ct=020050010&gno=22560'
const regionSource = 'https://www.wam.go.jp/gyoseiShiryou-files/documents/2024/0327195924349/20240329_119.pdf'
const inputClass = 'mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200'
function Select({ label, value, onChange, choices, placeholder = '選択してください' }: { label: string; value: string; onChange: (v: string) => void; choices: { value: string; label: string }[]; placeholder?: string }) {
  const id = useId()
  return <div className="min-w-0"><label htmlFor={id} className="text-xs font-bold text-slate-600">{label}</label><select id={id} className={inputClass} value={value} onChange={e => onChange(e.target.value)}><option value="">{placeholder}</option>{choices.map(c => <option value={c.value} key={c.value}>{c.label}</option>)}</select></div>
}
function Quantity({ label, value, onChange, max = 999, step = 1 }: { label: string; value: number; onChange: (n: number) => void; max?: number; step?: number }) {
  const id = useId()
  return <div className="min-w-0"><label htmlFor={id} className="text-xs font-bold text-slate-600">{label}</label><input id={id} type="number" inputMode={step === 1 ? 'numeric' : 'decimal'} min={0} max={max} step={step} className={inputClass} value={Number.isFinite(value) ? value : ''} onChange={e => onChange(e.target.value === '' ? NaN : Number(e.target.value))} /></div>
}
const options = (values: string[]) => values.map(value => ({ value, label: value }))
type PlanRow = { key: number; group: string; duration: string; mode: string; count: number }
export default function FeeSimulator({ fees, tariffs = [], serviceType = '', facilityName = '', address = '', feesUnavailable = false, providerSettings }: { fees: Fee[]; tariffs?: Tariff[]; serviceType?: string; facilityName?: string; address?: string; feesUnavailable?: boolean; providerSettings?: unknown }) {
  const bases = tariffs.filter(t => !t.addonGroup)
  const addonTariffs = tariffs.filter(t => t.addonGroup)
  const groups = Array.from(new Set(bases.map(t => t.group)))
  const official = bases.length > 0
  const prefix = bases[0]?.code.slice(0, 2) || ''
  const dayService = ['15','16','78'].includes(prefix)
  const [care, setCare] = useState('要介護1')
  const [burden, setBurden] = useState(1)
  const [month, setMonth] = useState(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit' }).format(new Date()))
  const [plans, setPlans] = useState<PlanRow[]>([{ key: 1, group: groups.length === 1 ? groups[0] : '', duration: '', mode: 'weekly', count: 2 }])
  const service = providerService(serviceType)
  const registered = readProviderSettings(providerSettings, serviceType)
  const applicable = applicableProviderSettings(providerSettings, serviceType, month)
  const area = applicable?.area || ''
  const facilityGroup = applicable?.group || (service?.prefix === '78' ? '地域密着型' : '')
  const [addons, setAddons] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(applicable?.addons || {}).filter(([key, value]) => key === '処遇改善' || value === 'none')))
  const [addonCounts, setAddonCounts] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<string[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [daysOverride, setDaysOverride] = useState<number | null>(null)
  const [meals, setMeals] = useState(1)
  const [hours, setHours] = useState(1)
  const [otherUnits, setOtherUnits] = useState(0)
  const [copyStatus, setCopyStatus] = useState('')
  const careNumber = Number(care.replace('要介護',''))
  const monthValid = /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && month >= '2026-06' && month <= '2027-03'
  const daysInMonth = monthValid ? new Date(Number(month.slice(0,4)), Number(month.slice(5)), 0).getDate() : 31
  const counts = plans.map(p => frequencyCount(p.mode,p.count))
  const visits = counts.reduce<number>((sum,c) => sum + (c ?? 0),0)
  const days = daysOverride ?? Math.min(daysInMonth,visits)
  const price = unitPrice(prefix,area)
  const resolved = plans.map((p,i) => ({ tariff: bases.find(t => t.group === (service?.user_selects_service ? p.group : facilityGroup) && t.duration === p.duration && (t.care === 0 || t.care === careNumber)), count: counts[i] }))
  const selectedAddons = Object.entries({ ...addons, ...(applicable?.addons['処遇改善'] ? { '処遇改善': applicable.addons['処遇改善'] } : {}) }).filter(([key, code]) => applicable?.addons[key] === code).map(([, code]) => addonTariffs.find(t => t.code === code)).filter((t): t is Tariff => Boolean(t))
  const addonLines = selectedAddons.map(tariff => ({ tariff, count: visits === 0 ? 0 : addonCounts[tariff.code] ?? (tariff.monthly ? 1 : visits) }))
  const issues: string[] = []
  if (![1,2,3].includes(burden)) issues.push('負担割合を選択してください。')
  if (counts.some(c => c === null) || visits > 999 || plans.some(p => p.mode === 'weekly' && (p.count > 21 || !Number.isInteger(p.count)))) issues.push('利用回数は整数で入力してください（週0〜21回・月0〜999回）。')
  if (!Number.isFinite(days) || !Number.isInteger(days) || days < 0 || days > daysInMonth) issues.push('利用日数を対象月の日数以内で入力してください。')
  if (official) {
    if (!monthValid) issues.push('この公定単価で試算できる対象月は2026年6月〜2027年3月です。')
    if (!careLimits[careNumber]) issues.push('要支援・事業対象者は自治体の総合事業や予防サービスの料金を確認してください。')
    if (!applicable) issues.push(registered ? '対象月は、事業所が登録した料金計算条件の適用期間外です。事業所にご確認ください。' : 'この事業所の料金計算条件はまだ登録されていません。事業所にご確認ください。')
    if (!price) issues.push('事業所所在地の地域区分が未確認です。')
    if (!service?.user_selects_service && !facilityGroup) issues.push('事業所の規模・提供体制が未確認です。')
    if (resolved.some(p => !p.tariff)) issues.push('利用時間・サービス内容を選択してください。')
    if (dayService && (visits > daysInMonth || days > visits)) issues.push('通所の利用回数・日数を対象月の日数以内で確認してください。')
    if (addonLines.some(x => !Number.isInteger(x.count) || x.count < 0 || x.count > (x.tariff.monthly ? 1 : visits))) issues.push('加算の回数は、月額なら1回、日・回単位なら利用回数以内で指定してください。')
    if (selectedAddons.some(t => t.addonGroup === '個別機能訓練Ⅱ') && !selectedAddons.some(t => t.addonGroup === '個別機能訓練Ⅰ')) issues.push('個別機能訓練加算Ⅱは、加算Ⅰの選択も確認してください。')
    if (!Number.isInteger(otherUnits) || otherUnits < 0) issues.push('他サービスの利用単位数は0以上の整数で入力してください。')
  }
  const insurance = official && issues.length === 0 && price ? insuranceEstimate(resolved as {tariff: Tariff; count: number}[],addonLines,price,burden) : null
  const overLimit = Boolean(insurance && insurance.limitUnits + otherUnits > (careLimits[careNumber] || 0))
  if (overLimit) issues.push('区分支給限度額を超えるため、超過分の全額負担をケアマネに確認してください。合計額の確定表示は保留しています。')
  const activeFees = official ? fees.filter(f => f.fee_section !== 'insurance_estimate') : fees
  const provider = providerFeeTotal(activeFees,{care,visits,days,meals,hours,quantities,selected,burden})
  const legacyInsurance = activeFees.some(f => f.fee_section === 'insurance_estimate')
  const hasInsurance = official ? insurance !== null : legacyInsurance
  const legacyNeedsCare = activeFees.some(f => f.category === 'care_level' && f.fee_section === 'insurance_estimate') && !activeFees.some(f => f.fee_section === 'insurance_estimate' && f.care_level === care)
  const total = { min: provider.total.min + (insurance?.selfPay || 0), max: provider.total.max + (insurance?.selfPay || 0) }
  const ready = issues.length === 0 && provider.unknown.length === 0 && !feesUnavailable && hasInsurance && !legacyNeedsCare
  const selectedCareFees = activeFees.filter(f => !f.care_level || f.care_level === care).sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0))
  const careLevels = Array.from(new Set(['要介護1','要介護2','要介護3','要介護4','要介護5','要支援1','要支援2','事業対象者', ...fees.map(f => f.care_level).filter((v): v is string => Boolean(v))]))
  const unconfirmedAddons = official && !applicable?.addons['処遇改善']
  const missingAddonGroups = Array.from(new Set(addonTariffs.map(t => t.addonGroup))).filter(key => !applicable?.addons[key])
  function updatePlan(key: number, patch: Partial<PlanRow>) { setPlans(p => p.map(row => row.key === key ? {...row,...patch} : row)) }
  function feeQuantity(id: string, value: number | null) { setQuantities(prev => { const next = {...prev}; if (value === null) delete next[id]; else next[id] = value; return next }) }
  async function copyEstimate() {
    const text = [facilityName, `${serviceType} / ${month} / ${care} / ${burden}割負担`,
      `事業所条件：${facilityGroup || serviceType} / 地域区分 ${regionLabel(area)}${applicable ? ` / 適用 ${applicable.effective_from}〜${applicable.effective_to}` : ' / 未確認'}`,
      ...plans.map(p => `${service?.user_selects_service ? p.group : facilityGroup} ${p.duration} ${p.mode === 'weekly' ? '週' : '月'}${p.count}回（月${frequencyCount(p.mode,p.count)}回換算）`),
      ...(insurance ? [`地域単価 ${price}円 / 保険単位 ${insurance.units} / 保険自己負担 ${insurance.selfPay.toLocaleString()}円`, ...insurance.lines.map(x => `${x.tariff.name} ${x.tariff.units}単位 × ${x.count} = ${x.totalUnits}単位`)] : []),
      ...provider.rows.map(r => `${r.fee.item_name}：${formatYen(amountRange(r.fee))}/${billingLabels[r.fee.billing_unit || 'monthly']} × ${r.quantity} = ${formatYen(r.range)}${r.initial ? '（初期費用・月額外）' : ''}`),
      `${ready ? activeFees.length === 0 ? '介護保険分のみの月額目安' : unconfirmedAddons ? '加算未確認の月額小計' : '入力条件での月額目安' : '計算できた範囲の小計'}：${formatYen(total)}`,
      ...issues, ...(provider.unknown.length ? ['金額が未登録の項目は含みません。'] : []), ...(feesUnavailable ? ['事業所料金を取得できていません。'] : []),
      '選択していない加算・減算、公費助成、高額介護サービス費等は反映していません。事業所の届出・適用条件とあわせて確認してください。',
      ...(official ? [`公定単価：令和8年6月版 ${source}`] : ['事業所が登録した1割負担目安を使用。']),window.location.href].join('\n')
    try { await navigator.clipboard.writeText(text); setCopyStatus('内訳をコピーしました。') } catch { setCopyStatus('コピーできませんでした。画面の内訳をご確認ください。') }
  }
  return <div className="space-y-5 text-sm">
    <div className="rounded-2xl bg-slate-950 p-5 text-white"><p className="text-xs text-rose-200">{facilityName || 'この事業所'} · {serviceType}</p><h3 className="mt-2 flex items-center gap-2 text-lg font-bold"><Calculator className="h-5 w-5" />利用条件から料金を試算</h3><p className="mt-2 text-xs leading-6 text-slate-300">{official ? '公定単価による介護保険の自己負担と、事業所が公開した食費などの自費を合算します。' : '事業所が公開した料金と、入力した回数・日数から試算します。このサービスの公定単価による自動計算は準備中です。'}</p></div>

    {official && <section aria-label="この事業所の料金計算条件" className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="font-bold text-slate-900">この事業所の料金計算条件</h3>
      <dl className="mt-3 space-y-2 text-xs leading-5">
        <div className="flex justify-between gap-3"><dt className="text-slate-500">サービス</dt><dd className="text-right font-semibold">{serviceType}</dd></div>
        {!service?.user_selects_service && <div className="flex justify-between gap-3"><dt className="shrink-0 text-slate-500">規模・提供体制</dt><dd className="text-right font-semibold">{facilityGroup || '未登録・事業所に確認'}</dd></div>}
        <div className="flex justify-between gap-3"><dt className="text-slate-500">地域区分</dt><dd className="text-right font-semibold">{regionLabel(area)}{price ? `（1単位 ${price}円）` : ''}</dd></div>
        {applicable && <div className="flex justify-between gap-3"><dt className="text-slate-500">適用期間</dt><dd>{applicable.effective_from}〜{applicable.effective_to}</dd></div>}
      </dl>
      {address && <p className="mt-3 text-xs text-slate-500">所在地：{address}</p>}
      <p className="mt-3 text-xs leading-5 text-slate-500">{applicable ? '事業所が登録した条件を自動で使用しています。' : '事業所の確認・登録後に自動で反映されます。未確認の条件では介護保険の自己負担額を計算しません。'} <a href={regionSource} target="_blank" rel="noreferrer" className="underline">地域区分について</a></p>
    </section>}

    <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-bold text-slate-900">1. 利用する方の条件</h3>
      <label className="block text-xs font-bold text-slate-600">対象月<input aria-label="対象月" type="month" min="2026-06" max="2027-03" value={month} onChange={e => setMonth(e.target.value)} className={inputClass} /></label>
      <div className="grid grid-cols-2 gap-3"><Select label="介護度" value={care} onChange={setCare} choices={options(careLevels)} /><Select label="負担割合" value={String(burden)} onChange={v => setBurden(Number(v))} choices={[1,2,3].map(v => ({value:String(v),label:`${v}割負担`}))} /></div>

    </section>

    <section className="space-y-3"><h3 className="font-bold text-slate-900">2. 利用時間・回数</h3>{plans.map((p,i) => {
      const durations = Array.from(new Set(bases.filter(t => t.group === (service?.user_selects_service ? p.group : facilityGroup) && (t.care === 0 || t.care === careNumber)).map(t => t.duration)))
      return <div key={p.key} className="space-y-3 rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold text-slate-500">利用パターン {i+1}</p>{plans.length > 1 && <button type="button" aria-label={`利用パターン${i+1}を削除`} onClick={() => setPlans(rows => rows.filter(r => r.key !== p.key))} className="p-2 text-slate-500"><Trash2 className="h-4 w-4" /></button>}</div>
        {official && <>{service?.user_selects_service && <Select label="利用するサービス内容" value={p.group} choices={options(groups)} onChange={v => updatePlan(p.key,{group:v,duration:''})} />}<Select label="1回の利用時間・区分" value={p.duration} choices={options(durations)} onChange={v => updatePlan(p.key,{duration:v})} /></>}
        <div className="grid grid-cols-2 gap-3"><Select label="回数の指定方法" value={p.mode} choices={[{value:'weekly',label:'週あたり'},{value:'monthly',label:'月あたり'}]} onChange={v => updatePlan(p.key,{mode:v})} /><Quantity label={p.mode === 'weekly' ? '週の利用回数' : '月の利用回数'} value={p.count} max={p.mode === 'weekly' ? 21 : dayService ? daysInMonth : 999} onChange={v => updatePlan(p.key,{count:v})} /></div>
        <p className="text-xs text-slate-500">{p.mode === 'weekly' ? `週${p.count || 0}回 × 4.3週 ≒ 月${counts[i] ?? '—'}回。正確な回数は「月あたり」で指定できます。` : `月${counts[i] ?? '—'}回として計算します。`}</p>
        {resolved[i].tariff && <p className="rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-800">基本報酬：{resolved[i].tariff?.units}単位／回（コード {resolved[i].tariff?.code}）</p>}
      </div>
    })}
    {official && <button type="button" className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700" onClick={() => setPlans(p => [...p,{key:Math.max(...p.map(r=>r.key))+1,group:groups.length===1?groups[0]:'',duration:'',mode:'monthly',count:1}])}><Plus className="h-4 w-4" />別の時間・利用パターンを追加</button>}
    </section>

    {official && <details className="rounded-2xl border border-slate-200 p-4"><summary className="cursor-pointer font-bold text-slate-900">利用する加算・他サービスの利用</summary><p className="mt-3 text-xs leading-5 text-slate-500">登録済みの届出加算を表示しています。処遇改善は自動で含めます。その他の加算は、ご本人が対象となるものと回数を選んでください。</p><div className="mt-4 space-y-4">{Array.from(new Set(addonTariffs.map(t => t.addonGroup))).filter(group => applicable?.addons[group]).map(group => {
      const registeredCode = applicable!.addons[group]
      const chosen = addonTariffs.find(t => t.code === addons[group] && t.code === registeredCode)
      const registeredAddon = addonTariffs.find(t => t.code === registeredCode)
      if (group === '処遇改善' || registeredCode === 'none') return <p key={group} className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-700">{group}：{registeredCode === 'none' ? '算定なし' : registeredAddon?.name}{registeredAddon?.rate != null ? `（${Number((registeredAddon.rate * 100).toFixed(2))}%・自動計算）` : ''}</p>
      return <div key={group}><Select label={group === '処遇改善' ? '介護職員等処遇改善加算' : group} value={addons[group] || ''} placeholder="利用しない・合計に含めない" choices={addonTariffs.filter(t => t.addonGroup===group && t.code === registeredCode).map(t => ({value:t.code,label:`${t.name}（${t.rate !== null ? `${Number((t.rate*100).toFixed(2))}%` : `${t.units}単位／${t.monthly ? '月' : '回'}`}）`}))} onChange={v=>setAddons(a=>({...a,[group]:v}))} />{chosen && !chosen.monthly && chosen.rate === null && <div className="mt-2"><Quantity label={`${group}の月の算定回数`} max={visits} value={addonCounts[chosen.code] ?? visits} onChange={v=>setAddonCounts(a=>({...a,[chosen.code]:v}))} /></div>}</div>
    })}{missingAddonGroups.length > 0 && <p className="text-xs leading-5 text-amber-800">届出未確認・計算対象外：{missingAddonGroups.join('、')}。適用の有無は事業所にご確認ください。</p>}<Quantity label="他サービスで使う支給限度額対象単位（月）" value={otherUnits} max={99999} onChange={setOtherUnits} /><p className="text-xs text-slate-500">要介護{careNumber || '—'}の基準は月{careLimits[careNumber]?.toLocaleString() || '—'}単位。超過する場合は全額自己負担の確認が必要です。</p></div></details>}

    <section className="space-y-4"><h3 className="font-bold text-slate-900">3. 事業所が設定した料金</h3><p className="text-xs leading-5 text-slate-500">CareSpace OSのCaresタブで公開された料金です。食数・日数・回数を調整できます。月額固定料金は回数で変わりません。</p>
      {feesUnavailable ? <p role="alert" className="rounded-xl bg-amber-50 p-3 text-amber-900">料金表を取得できませんでした。再読み込みしてください。自費を含めた合計は表示していません。</p> : activeFees.length === 0 ? <p className="rounded-xl bg-slate-50 p-3 text-slate-600">自費料金はまだ公開されていません。必要な実費は事業所にご確認ください。</p> : <>
      {activeFees.some(f => ['daily','per_meal'].includes(f.billing_unit || '')) && <Quantity label="月の利用日数（食費・日額料金に使用）" value={days} max={daysInMonth} onChange={setDaysOverride} />}
      {activeFees.some(f => f.billing_unit === 'per_meal') && <Quantity label="1日の食数" value={meals} max={10} onChange={setMeals} />}
      {activeFees.some(f => f.billing_unit === 'per_hour') && <Quantity label="自費の時間料金：1回の時間数" value={hours} max={24} step={0.25} onChange={setHours} />}
      {selectedCareFees.map(fee => {
        const optional = fee.is_optional ?? fee.category === 'option'
        const row = provider.rows.find(r => r.fee.id === fee.id)
        const unit = fee.billing_unit || 'monthly'
        const editable = !['monthly','one_time'].includes(unit)
        const isSelected = !optional || selected.includes(fee.id)
        return <div key={fee.id} className={`rounded-2xl border p-4 ${isSelected ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50'}`}>
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold text-slate-900">{fee.item_name}</p><p className="mt-1 text-xs text-slate-500">{formatYen(amountRange(fee))}／{billingLabels[unit] || '単位未設定'}{fee.fee_section === 'insurance_estimate' ? '（1割負担の登録目安）' : ''}</p></div>{optional && <label className="inline-flex shrink-0 items-center gap-1 text-xs"><input type="checkbox" checked={isSelected} onChange={()=>setSelected(s=>s.includes(fee.id)?s.filter(id=>id!==fee.id):[...s,fee.id])} />含める</label>}</div>
          {row && editable && <div className="mt-3"><Quantity label={`${fee.item_name}の月の数量（${billingLabels[unit] || '数量'}）`} value={row.quantity} max={100000} step={unit === 'per_hour' ? 0.25 : 1} onChange={n=>feeQuantity(fee.id,n)} />{quantities[fee.id] !== undefined && <button type="button" onClick={()=>feeQuantity(fee.id,null)} className="mt-2 text-xs text-rose-700 underline">利用条件からの計算に戻す</button>}</div>}
          {row && <p className="mt-3 break-words text-right font-bold text-slate-900">{formatYen(amountRange(fee))} × {Number.isFinite(row.quantity) ? row.quantity : '—'}{billingLabels[unit]}{fee.fee_section === 'insurance_estimate' ? ` × ${burden}` : ''} = {formatYen(row.range)}{row.initial && <span className="block text-xs font-normal text-slate-500">初期費用・月額合計には含めません</span>}</p>}
          {fee.notes && <p className="mt-2 text-xs leading-5 text-slate-500">{fee.notes}</p>}
          {unit==='monthly' && /食費|食事|朝食|昼食|夕食/.test(fee.item_name) && <p className="mt-2 text-xs leading-5 text-amber-800">この食費は月額で登録されています。1食の料金の場合は、事業所のCaresタブで「1食」に修正してください。</p>}
        </div>
      })}</>}
      {official && fees.some(f=>f.fee_section==='insurance_estimate') && <p className="text-xs leading-5 text-slate-500">登録済みの介護保険の目安料金は、公定単価による計算と重なるため合算していません。</p>}
    </section>

    <section aria-live="polite" className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><p className="text-sm font-bold text-rose-900">{ready ? activeFees.length === 0 ? '介護保険分のみの月額目安' : unconfirmedAddons ? '加算未確認の月額小計' : '入力条件での月額目安' : '月額合計の確認が必要です'}</p><p className="mt-2 break-words text-3xl font-bold tabular-nums text-rose-900">{ready ? formatYen(total) : '条件・未確認項目を確認'}</p>
      <dl className="mt-4 space-y-3 text-xs">{official && <div className="flex justify-between gap-3"><dt>介護保険の自己負担（{burden}割）</dt><dd className="font-bold">{insurance ? `${insurance.selfPay.toLocaleString()}円` : '条件を選択'}</dd></div>}<div className="flex justify-between gap-3"><dt>{official ? '登録済み自費の小計' : '登録料金で計算できた小計'}</dt><dd className="font-bold">{formatYen(provider.total)}</dd></div></dl>
      {insurance && <details className="mt-4 rounded-xl bg-white p-3"><summary className="cursor-pointer text-xs font-bold text-slate-700">介護保険の計算内訳</summary><div className="mt-3 space-y-2 text-xs leading-5 text-slate-600">{insurance.lines.map((line,i)=><p key={`${line.tariff.code}-${i}`}>{line.tariff.name}：{line.tariff.units}単位 × {line.tariff.monthly ? '1月' : `${line.count}回`} = {line.totalUnits.toLocaleString()}単位</p>)}<p>処遇改善加算：{insurance.rateUnits.toLocaleString()}単位</p><p>合計 {insurance.units.toLocaleString()}単位 × {price}円 = {insurance.cost.toLocaleString()}円</p><p>保険給付 {insurance.insurance.toLocaleString()}円を差し引いた自己負担 {insurance.selfPay.toLocaleString()}円</p><p>給付管理の対象：{insurance.limitUnits.toLocaleString()}単位</p></div></details>}
      <div className="mt-3 space-y-2 text-xs leading-5 text-amber-900">{issues.map(issue=><p key={issue}>{issue}</p>)}{provider.unknown.length > 0 && <p>金額・数量が未確認：{provider.unknown.map(r=>r.fee.item_name).join('、')}。0円として合算していません。</p>}{(!hasInsurance || legacyNeedsCare) && !official && <p>この介護度の介護保険料金が未登録です。自費分のみ確認できます。</p>}{unconfirmedAddons && <p>処遇改善などの加算は未確認です。事業所に確認して選択すると合算されます。</p>}{activeFees.length===0 && <p>未公開の自費は含めていません。</p>}</div>
      <button type="button" onClick={copyEstimate} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-rose-800 ring-1 ring-rose-200"><Copy className="h-4 w-4" />条件・内訳をコピー</button>{copyStatus && <p role="status" className="mt-2 text-xs text-rose-800">{copyStatus}</p>}
    </section>
    <div className="flex gap-2 rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-500"><Info className="mt-1 h-4 w-4 shrink-0" /><div><p>概算です。選択していない加算・減算、公費助成、高額介護サービス費等は反映していません。事業所の算定体制や適用条件、他サービスを含む支給限度額によって実際の請求額は変わります。</p>{official && <p className="mt-2">公定単価：<a href={source} target="_blank" rel="noreferrer" className="underline">厚生労働省・令和8年6月確定版</a>。標準の基本報酬と表示中の加算が対象です。共生型・特殊な減算・予防／総合事業・医療保険は含みません。</p>}</div></div>
  </div>
}
