import type { Metadata, Viewport } from 'next'
import './globals.css'
import AuthHeader from '@/components/AuthHeader'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: {
    default: 'Cares — 介護事業所の情報発信プラットフォーム',
    template: '%s — Cares',
  },
  description: '介護事業所の公式情報、空き状況、料金表、現場の声をまとめて発信・確認できる情報プラットフォーム。',
  icons: {
    icon: '/favicon.png',
  },
  metadataBase: new URL('https://cares.carespace.jp'),
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: 'Cares — 介護事業所の情報発信プラットフォーム',
    title: 'Cares — 介護事業所の情報発信プラットフォーム',
    description: '介護事業所の公式情報、空き状況、料金表、現場の声をまとめて確認できます。',
    url: 'https://cares.carespace.jp',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cares — 介護事業所の情報発信プラットフォーム',
    description: '介護事業所の公式情報、空き状況、料金表、現場の声をまとめて確認できます。',
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
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`,
            }}
          />
        </head>
      )}
      <body className="notebook-bg text-gray-900 antialiased">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-50">
          <div className="px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
            <a href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Cares" className="h-8 sm:h-12" />
              <span className="hidden sm:inline text-sm font-semibold text-slate-600 whitespace-nowrap">
                介護事業所の情報発信プラットフォーム
              </span>
            </a>
            <nav className="flex min-w-0 items-center gap-2 sm:gap-4 text-sm">
              <a
                href="/for-business"
                className="hidden sm:inline-flex items-center rounded-full bg-cares-50 px-3 py-1.5 text-cares-700 hover:bg-cares-100 font-semibold transition-colors"
              >
                事業所向け
              </a>
              <a
                href="/for-business"
                className="hidden min-[390px]:inline text-gray-500 hover:text-cares-600 font-medium"
              >
                施設掲載
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
        <footer className="bg-white border-t border-gray-200 py-6">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
            <div className="flex items-center justify-center gap-4 mb-3">
              <a href="/directory" className="hover:text-cares-600 transition-colors">施設を探す</a>
              <span className="text-gray-200">|</span>
              <a href="/area" className="hover:text-cares-600 transition-colors">エリアから探す</a>
              <span className="text-gray-200">|</span>
              <a href="/for-business" className="hover:text-cares-600 transition-colors">施設掲載</a>
            </div>
            <p>&copy; {new Date().getFullYear()} 株式会社CARESPACE</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
