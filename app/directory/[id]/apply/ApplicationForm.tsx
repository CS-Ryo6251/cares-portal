'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Check, FileText, HeartHandshake, Loader2, ShieldCheck, Trash2 } from 'lucide-react'
import { AI_FIELDS, CARE_LEVELS, EMPTY_FIELDS, FIELD_LABELS, IntakeFields, MAX_FILE_BYTES, REQUEST_TYPES, validateFields } from '@/lib/intake'
import type { IntakeTarget } from '@/lib/intake-server'

const inputClass = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100'
type Attachment = { id: string; mime: string; size: number; name: string }

export default function ApplicationForm({ target }: { target: IntakeTarget }) {
  const [fields, setFields] = useState<IntakeFields>({ ...EMPTY_FIELDS })
  const [files, setFiles] = useState<Attachment[]>([])
  const [extracted, setExtracted] = useState<Partial<IntakeFields> | null>(null)
  const [busy, setBusy] = useState(''); const [error, setError] = useState('')
  const [attachmentConsent, setAttachmentConsent] = useState(false); const [aiConsent, setAiConsent] = useState(false)
  const [sendConsent, setSendConsent] = useState(false); const [review, setReview] = useState(false)
  const [receipt, setReceipt] = useState(''); const [aiAvailable, setAiAvailable] = useState(true)
  const draftId = useRef(''); const started = useRef(false); const operation = useRef(false); const fileInput = useRef<HTMLInputElement>(null)
  const endpoint = `/api/intake/${target.id}`
  useEffect(() => {
    function warn(e: BeforeUnloadEvent) { if (!receipt && (files.length || fields.applicant_name || fields.client_name)) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn)
  }, [fields.applicant_name, fields.client_name, files.length, receipt])
  async function api(body: Record<string, unknown>, method = 'POST') {
    const response = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, draftId: draftId.current }), cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '通信できませんでした。再度お試しください。')
    return data
  }
  async function start() {
    if (started.current) return
    const data = await api({ action: 'start' }); started.current = true; draftId.current = data.draftId; setAiAvailable(data.aiAvailable)
  }
  async function run(label: string, action: () => Promise<void>) {
    if (operation.current) return
    operation.current = true; setBusy(label); setError('')
    try { await action() } catch (e) { setError(e instanceof Error ? e.message : '通信できませんでした。入力内容を残したまま再試行できます。') }
    finally { operation.current = false; setBusy('') }
  }
  async function upload(file: File) {
    await run('書類を添付しています', async () => {
      if (!attachmentConsent) throw new Error('書類の提供への同意にチェックしてください。')
      if (file.size > MAX_FILE_BYTES) throw new Error('3MB以下の画像・PDFを選んでください。')
      if (files.length >= 3) throw new Error('添付は3件までです。')
      await start()
      const form = new FormData(); form.set('file', file); form.set('consent', 'true'); form.set('draftId', draftId.current)
      const response = await fetch(endpoint, { method: 'PUT', body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '添付できませんでした。')
      setFiles(current => [...current, { ...data, name: file.name }])
    })
    if (fileInput.current) fileInput.current.value = ''
  }
  function change(key: keyof IntakeFields, value: string) { setFields(current => ({ ...current, [key]: value })); setSendConsent(false) }
  function confirm() {
    try { setFields(validateFields(fields)); setError(''); setReview(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }
    catch (e) { setError((e as Error).message) }
  }
  if (receipt) return <section className="mt-6 rounded-3xl border border-rose-100 bg-white p-7 text-center sm:p-12"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check /></div><h1 className="mt-5 text-2xl font-bold">お申込みを届けました</h1><p className="mt-4 leading-7 text-slate-600">{target.name}の担当者が内容を確認し、入力された連絡先へご連絡します。</p><p className="mt-4 text-sm text-slate-500">この時点では利用や日程は確定していません。お急ぎの場合は事業所へお電話ください。</p><p className="mt-6 break-all rounded-xl bg-stone-50 p-3 text-xs text-slate-500">受付番号：{receipt}</p><a href={`/directory/${target.id}`} className="mt-6 inline-flex min-h-12 items-center rounded-full bg-rose-600 px-7 font-bold text-white">事業所のページに戻る</a></section>
  return <>
    <header className="my-7"><p className="text-sm font-semibold text-rose-600">{target.name}</p><h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{review ? '送る内容をご確認ください' : 'はじめの一歩を、ここから。'}</h1><p className="mt-3 text-sm leading-7 text-slate-600">見学・体験・利用について、事業所に直接相談できます。ご本人、ご家族、ケアマネジャーからお申込みいただけます。</p><ol className="mt-5 flex gap-2 text-xs font-bold"><li className={`rounded-full px-4 py-2 ${!review ? 'bg-rose-100 text-rose-700' : 'bg-white text-slate-500'}`}>1 内容の入力</li><li className={`rounded-full px-4 py-2 ${review ? 'bg-rose-100 text-rose-700' : 'bg-white text-slate-500'}`}>2 確認して送信</li></ol></header>
    <form onSubmit={e => { e.preventDefault(); if (!review) confirm() }} className="space-y-5">
      {!review ? <>
        <section className="rounded-3xl border border-rose-100 bg-white p-5 sm:p-7"><h2 className="flex items-center gap-2 text-lg font-bold"><HeartHandshake className="h-5 w-5 text-rose-500" />ご希望をお聞かせください</h2><div className="mt-5 grid grid-cols-3 gap-2">{Object.entries(REQUEST_TYPES).map(([key, label]) => <label key={key} className={`flex min-h-14 cursor-pointer focus-within:ring-2 focus-within:ring-rose-400 items-center justify-center gap-2 rounded-2xl border px-2 text-sm font-bold ${fields.request_type === key ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600'}`}><input type="radio" name="request_type" className="sr-only" value={key} checked={fields.request_type === key} onChange={() => change('request_type', key)} />{label}</label>)}</div></section>
        <section className="rounded-3xl border border-stone-200 bg-stone-50 p-5 sm:p-7"><div className="flex items-center gap-2"><Camera className="h-5 w-5 text-rose-500" /><h2 className="text-lg font-bold">書類から入力をお手伝い</h2><span className="ml-auto text-xs text-slate-500">任意</span></div><p className="mt-3 text-sm leading-7 text-slate-600">基本情報やフェイスシートの写真・PDFを添付できます。AIで名前・介護度などを読み取り、入力の手間を減らせます。</p><p className="mt-2 text-xs leading-6 text-slate-500">1人分の資料を3件まで、1件3MB以内。JPEG・PNG・WebP・PDFに対応（AI読取りは5ページまで）。個人番号や不要な保険証番号は隠してください。AIを使わず下の欄に直接入力することもできます。</p>
          <label className="mt-4 flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={attachmentConsent} onChange={e => setAttachmentConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-rose-600" />ご本人の同意または適切な代理権限があり、送信時に添付した原本も{target.name}へ提供することに同意します。</label>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" aria-label="基本情報の書類を選ぶ" onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file) }} />
          <button type="button" disabled={!!busy || !attachmentConsent || files.length >= 3} onClick={() => fileInput.current?.click()} className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold disabled:opacity-40"><Camera className="h-4 w-4" />写真を撮る・書類を選ぶ</button>
          {files.length > 0 && <div className="mt-4 space-y-3">{files.map((file, i) => <div key={file.id} className="rounded-xl bg-white p-4"><p className="flex items-center gap-2 break-all text-sm font-semibold"><FileText className="h-4 w-4 shrink-0 text-slate-400" />書類{i + 1}：{file.name}</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={!!busy || !aiConsent || !aiAvailable} className="min-h-11 rounded-lg px-3 text-sm font-bold text-rose-700 disabled:opacity-40" onClick={() => void run('AIで読み取っています', async () => { const data = await api({ action: 'extract', fileId: file.id, aiConsent }); setExtracted(data.fields) })}>AIで読み取る</button><button type="button" disabled={!!busy} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm text-slate-500" onClick={() => void run('書類を外しています', async () => { await api({ fileId: file.id }, 'DELETE'); setFiles(current => current.filter(item => item.id !== file.id)); setExtracted(null) })}><Trash2 className="h-4 w-4" />外す</button></div></div>)}</div>}
          {files.length > 0 && <label className="mt-4 flex items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-rose-600" checked={aiConsent} onChange={e => setAiConsent(e.target.checked)} />AI読取りのため、書類をOpenAI APIに送信することに同意します。読み取った内容は自分で確認・修正します。</label>}
          {!aiAvailable && <p className="mt-3 text-sm text-amber-800">AI読取りは現在利用できません。添付と手入力でお申込みいただけます。</p>}
          {extracted && <div className="mt-5 rounded-2xl border border-rose-200 bg-white p-5"><h3 className="font-bold">読取り結果</h3><p className="mt-2 text-xs leading-6 text-slate-500">誤読がないか確認してください。反映すると、下に表示した項目の入力済みの内容も置き換わります。</p><dl className="mt-3 space-y-3">{AI_FIELDS.filter(key => extracted[key]).map(key => <div key={key}><dt className="text-xs text-slate-500">{FIELD_LABELS[key]}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{extracted[key]}</dd></div>)}</dl><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={!Object.keys(extracted).length} className="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white disabled:opacity-40" onClick={() => { setFields(current => ({ ...current, ...extracted })); setExtracted(null); setSendConsent(false) }}>確認して入力欄に反映</button><button type="button" className="min-h-11 px-3 text-sm text-slate-500" onClick={() => setExtracted(null)}>反映しない</button></div></div>}
        </section>
        <section className="rounded-3xl border border-slate-100 bg-white p-5 sm:p-7"><h2 className="text-lg font-bold">お名前・ご連絡先</h2><p className="mt-2 text-xs leading-6 text-slate-500">お名前と、電話番号またはメールアドレスをご入力ください。ほかの項目は分かる範囲で構いません。</p><div className="mt-5 grid gap-5 sm:grid-cols-2">{(Object.keys(FIELD_LABELS) as (keyof IntakeFields)[]).filter(key => key !== 'request_type').map(key => <label key={key} className={`block text-sm font-semibold text-slate-700 ${['notes','address','desired_dates','care_manager'].includes(key) ? 'sm:col-span-2' : ''}`}>{FIELD_LABELS[key]}{['applicant_name','client_name'].includes(key) && <span className="ml-2 text-xs text-rose-600">必須</span>}{key === 'care_level' ? <select className={inputClass} value={fields[key]} onChange={e => change(key, e.target.value)}>{CARE_LEVELS.map(value => <option key={value} value={value}>{value || '選択してください（任意）'}</option>)}</select> : key === 'notes' ? <textarea rows={4} maxLength={2000} className={inputClass} value={fields[key]} onChange={e => change(key, e.target.value)} /> : <input className={inputClass} type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : key === 'birth_date' ? 'date' : 'text'} autoComplete="off" maxLength={300} required={['applicant_name','client_name'].includes(key)} value={fields[key]} onChange={e => change(key, e.target.value)} />}</label>)}</div></section>
      </> : <section className="rounded-3xl border border-rose-100 bg-white p-5 sm:p-7"><h2 className="font-bold">送信先：{target.name}</h2><dl className="mt-5 divide-y divide-slate-100">{(Object.keys(FIELD_LABELS) as (keyof IntakeFields)[]).map(key => <div key={key} className="py-3"><dt className="text-xs text-slate-500">{FIELD_LABELS[key]}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-7">{key === 'request_type' ? REQUEST_TYPES[fields.request_type as keyof typeof REQUEST_TYPES] : fields[key] || '未入力'}</dd></div>)}</dl><h3 className="mt-5 text-sm font-bold">添付する原本（{files.length}件）</h3>{files.map((file, i) => <p key={file.id} className="mt-2 break-all text-sm text-slate-600">{i + 1}. {file.name}</p>)}<label className="mt-6 flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-sm leading-7"><input type="checkbox" checked={sendConsent} onChange={e => setSendConsent(e.target.checked)} className="mt-1.5 h-4 w-4 shrink-0 accent-rose-600" />入力内容・原本を確認しました。ご本人の同意または適切な代理権限のもと、{target.name}の受付担当者へ健康・介護情報を含む申込内容と添付資料を提供することに同意します。</label></section>}
      <p className="flex items-start gap-2 px-1 text-xs leading-6 text-slate-500"><ShieldCheck className="mt-1 h-4 w-4 shrink-0" />申込内容は公開されません。未送信の添付は原則48時間以内、送信済みの申込内容・添付は180日経過後に削除します。送信は利用契約や日程の確定ではありません。</p>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm leading-7 text-red-700">{error}</p>}
      {busy && <p role="status" className="flex items-center justify-center gap-2 text-sm text-rose-700"><Loader2 className="h-4 w-4 animate-spin" />{busy}</p>}
      <div className="flex flex-col gap-3 pb-8 sm:flex-row-reverse">{!review ? <button type="submit" disabled={!!busy} className="min-h-14 flex-1 rounded-full bg-rose-600 px-8 font-bold text-white disabled:opacity-40">入力内容を確認する</button> : <><button type="button" disabled={!!busy || !sendConsent || (files.length > 0 && !attachmentConsent)} onClick={() => void run('お申込みを届けています', async () => { await start(); const data = await api({ action: 'submit', fields, fileIds: files.map(file => file.id), consent: sendConsent, reviewed: true }); setReceipt(data.id); window.scrollTo({ top: 0, behavior: 'smooth' }) })} className="min-h-14 flex-1 rounded-full bg-rose-600 px-8 font-bold text-white disabled:opacity-40">この内容で事業所に申込む</button><button type="button" disabled={!!busy} className="min-h-14 rounded-full border border-slate-200 bg-white px-7 text-sm font-bold text-slate-600" onClick={() => { setReview(false); setSendConsent(false) }}>入力に戻る</button></>}</div>
    </form>
  </>
}
