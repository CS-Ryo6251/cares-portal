import type { Metadata, Viewport } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import { ArrowRight, HeartHandshake } from 'lucide-react'
import './globals.css'
import AuthHeader from '@/components/AuthHeader'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  display: 'swap',
  variable: '--font-noto-sans-jp',
})

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
  description: '介護事業所の公式情報、現在の空き状況、料金、写真、現場の評価をひとつのページで確認できます。',
  icons: {
    icon: '/favicon.png',
  },
  metadataBase: new URL('https://cares.carespace.jp'),
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: 'Cares by CareSpace',
    title: 'Cares by CareSpace — 介護事業所の「いま」が見つかる',
    description: '空き状況、料金、写真、現場の評価から、地域の介護事業所を探せます。',
    url: 'https://cares.carespace.jp',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cares by CareSpace — 介護事業所の「いま」が見つかる',
    description: '空き状況、料金、写真、現場の評価から、地域の介護事業所を探せます。',
  },
  alternates: {
    canonical: 'https://cares.carespace.jp',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  return (
    <html lang="ja" className={notoSansJP.variable}>
      {gaId && (
        <head>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`,
            }}
          />
        </head>
      )}
      <body className="notebook-bg font-sans text-gray-900 antialiased">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-rose-100 bg-white/95 shadow-[0_1px_18px_rgba(159,18,57,0.06)] backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-2 px-3 sm:h-16 sm:px-6">
            <a href="/" className="flex min-w-0 items-center gap-2.5" aria-label="Cares by CareSpace ホーム">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cares-500 to-cares-700 text-white shadow-lg shadow-cares-200/70">
                <HeartHandshake className="h-5 w-5" />
              </span>
              <span className="min-w-0 leading-none">
                <span className="block text-lg font-black tracking-tight text-slate-950">Cares</span>
                <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.14em] text-cares-600">by CareSpace</span>
              </span>
              <span className="hidden border-l border-slate-200 pl-3 text-xs font-semibold text-slate-500 lg:inline">
                介護事業所の「いま」が見つかる
              </span>
            </a>
            <nav className="flex min-w-0 items-center gap-2 text-sm sm:gap-3">
              <a
                href="/directory"
                className="hidden font-semibold text-slate-600 transition-colors hover:text-cares-600 sm:inline"
              >
                事業所を探す
              </a>
              <a
                href="/cases"
                className="hidden font-semibold text-slate-600 transition-colors hover:text-cares-600 md:inline"
              >
                支援案件
              </a>
              <a
                href="https://app.carespace.jp/signup/new-organization?source=cares"
                className="hidden items-center gap-1.5 rounded-full bg-cares-600 px-3.5 py-2 font-bold text-white shadow-sm transition hover:bg-cares-700 min-[430px]:inline-flex"
              >
                掲載・更新する
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
              <AuthHeader />
            </nav>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar is rendered by page components (needs searchParams) */}
          <main className="flex-1 min-w-0 min-h-screen">{children}</main>
        </div>

        {/* Footer */}
        <footer className="border-t border-rose-100 bg-slate-950 py-10 text-white">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="mb-2 flex items-center justify-center gap-2 font-black"><HeartHandshake className="h-5 w-5 text-cares-400" />Cares <span className="text-xs font-bold text-white/45">by CareSpace</span></div>
            <p className="mb-5 text-xs text-white/45">介護事業所の「いま」を、必要な人へ。</p>
            <div className="mb-5 flex flex-wrap items-center justify-center gap-4 text-sm text-white/60">
              <a href="/directory" className="transition-colors hover:text-white">事業所を探す</a>
              <a href="/cases" className="transition-colors hover:text-white">地域の支援案件</a>
              <a href="/area" className="transition-colors hover:text-white">エリアから探す</a>
              <a href="/for-business" className="transition-colors hover:text-white">掲載について</a>
              <a href="https://app.carespace.jp" className="transition-colors hover:text-white">CareSpaceOS</a>
            </div>
            <p className="text-xs text-white/35">&copy; {new Date().getFullYear()} 株式会社CARESPACE</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
