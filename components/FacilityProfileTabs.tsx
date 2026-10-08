'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { Camera, LayoutGrid, MapPin, ReceiptText } from 'lucide-react'

export default function FacilityProfileTabs({ posts, photos, information, fees }: { posts: ReactNode; photos: ReactNode; information: ReactNode; fees: ReactNode }) {
  const [active, setActive] = useState('posts')
  useEffect(() => {
    const openLinkedPost = () => {
      if (/^#(?:post|comments)-/.test(window.location.hash)) setActive('posts')
      if (window.location.hash === '#brochures') setActive('fees')
    }
    openLinkedPost()
    window.addEventListener('hashchange', openLinkedPost)
    return () => window.removeEventListener('hashchange', openLinkedPost)
  }, [])
  const tabs = [{ key: 'posts', label: '投稿', Icon: LayoutGrid }, { key: 'photos', label: '写真', Icon: Camera }, { key: 'information', label: '基本情報', Icon: MapPin }, { key: 'fees', label: '料金・資料', Icon: ReceiptText }]
  return <section className="mt-5 sm:mt-7">
    <nav aria-label="事業所ページの表示切替" className="mb-5 grid grid-cols-4 border-b border-slate-200 bg-white sm:rounded-t-2xl">
      {tabs.map(({ key, label, Icon }) => <button key={key} aria-pressed={active === key} onClick={() => setActive(key)} className={`flex min-h-14 flex-col items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-1 py-3 text-xs font-bold transition sm:flex-row sm:gap-2 sm:py-4 sm:text-sm ${active === key ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Icon className="h-4 w-4 shrink-0" />{label}</button>)}
    </nav>
    <div className={active === 'posts' ? '' : 'hidden'}>{posts}</div>
    {active === 'photos' && photos}
    {active === 'information' && information}
    {active === 'fees' && fees}
  </section>
}
