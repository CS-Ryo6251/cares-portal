import type { Metadata, Viewport } from 'next'
import { Search, HeartHandshake, BookOpen } from 'lucide-react'
import Image from 'next/image'
import './globals.css'
import AuthHeader from '@/components/AuthHeader'


const navigation = [{ href: '/', label: '事業所をさがす', Icon: Search }, { href: '/cases', label: '支援の相談', Icon: HeartHandshake }, { href: '/blog', label: 'コラム', Icon: BookOpen }]

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: {
    default: 'Cares by CareSpace — 介護事業所の「いま」が見つかる',
    template: '%s — Cares by CareSpace',
  },
  description: '介護事業所の公式情報、現在の空き状況、料金、写真、良かった体験と応援の声をひとつのページで確認できます。',
  icons: {
    icon: '/brand/cares-icon-b.png',
    apple: '/brand/cares-icon-b.png',
  },
  metadataBase: new URL('https://cares.carespace.jp'),
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: 'Cares by CareSpace',
    title: 'Cares by CareSpace — 介護事業所の「いま」が見つかる',
    description: '空き状況、料金、写真、良かった体験と応援の声から、地域の介護事業所を探せます。',
    url: 'https://cares.carespace.jp',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cares by CareSpace — 介護事業所の「いま」が見つかる',
    description: '空き状況、料金、写真、良かった体験と応援の声から、地域の介護事業所を探せます。',
  },
  alternates: {
    canonical: 'https://cares.carespace.jp',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  return (
    <html lang="ja">
      {gaId && (
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `if(!/^\\/(shortlists|my-actions)(\\/|$)/.test(location.pathname)){var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${gaId}';document.head.appendChild(s);window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}',{page_referrer:document.referrer.includes('/shortlists/')?'':document.referrer});}`,
            }}
          />
        </head>
      )}
      <body className="notebook-bg font-sans text-gray-900 antialiased">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-rose-100 bg-white/95 shadow-[0_1px_18px_rgba(159,18,57,0.06)] backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-2 px-3 sm:h-16 sm:px-6">
            <a href="/" className="flex min-w-0 items-center gap-2.5" aria-label="Cares by CareSpace ホーム">
              <span className="shrink-0 leading-none">
                <Image src="/brand/cares-logo-b.png" alt="Cares" width={2172} height={724} sizes="128px" priority className="h-auto w-28 sm:w-32" />
                <span className="block text-right text-[8px] font-bold uppercase tracking-[0.14em] text-cares-600">by CareSpace</span>
              </span>
              <span className="hidden border-l border-slate-200 pl-3 text-xs font-semibold text-slate-500 xl:inline">
                介護事業所の「いま」が見つかる
              </span>
            </a>
            <div className="flex shrink-0 items-center gap-3 sm:gap-5">
              <nav aria-label="メインメニュー" className="hidden items-center gap-2 lg:flex xl:gap-4">
                {navigation.map(({ href, label, Icon }) => <a key={href} href={href} className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl px-2 text-sm font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-cares-700"><Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-rose-500" />{label}</a>)}
              </nav>
              <AuthHeader />
            </div>
          </div>
          <nav aria-label="メインメニュー" className="grid grid-cols-3 border-t border-rose-50 px-2 lg:hidden">
            {navigation.map(({ href, label, Icon }) => <a key={href} href={href} className="inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-1 text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-cares-700"><Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-rose-500" />{label}</a>)}
          </nav>
        </header>

        <div className="flex">
          {/* Sidebar is rendered by page components (needs searchParams) */}
          <main className="flex-1 min-w-0 min-h-screen">{children}</main>
        </div>

        {/* Footer */}
        <footer className="border-t border-rose-100 bg-slate-950 py-10 text-white">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="mb-2 flex items-center justify-center gap-2"><Image src="/brand/cares-logo-b.png" alt="Cares" width={2172} height={724} sizes="120px" className="h-auto w-[120px] brightness-0 invert" /><span className="text-xs font-bold text-white/45">by CareSpace</span></div>
            <p className="mb-5 text-xs text-white/45">介護事業所の「いま」を、必要な人へ。</p>
            <div className="mb-5 flex flex-wrap items-center justify-center gap-4 text-sm text-white/60">
              <a href="/" className="transition-colors hover:text-white">事業所をさがす</a>
              <a href="/cases" className="transition-colors hover:text-white">支援の相談</a>
              <a href="/ranking" className="transition-colors hover:text-white">応援ランキング</a>
              <a href="/blog" className="transition-colors hover:text-white">コラム</a>
              <a href="/area" className="transition-colors hover:text-white">エリアから探す</a>
              <a href="/for-business" className="transition-colors hover:text-white">事業所の掲載管理・登録案内</a>
              <a href="https://app.carespace.jp" className="transition-colors hover:text-white">CareSpaceOS</a>
            </div>
            <p className="text-xs text-white/35">&copy; {new Date().getFullYear()} 株式会社CARESPACE</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
