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
    default: 'Cares — みんなでつくる介護施設ノート',
    template: '%s — Cares',
  },
  description: '全国18万件の介護事業所の空き状況・料金・専門職メモをみんなで共有。ケアマネ・MSW・ご家族の施設探しを効率化する介護施設情報プラットフォーム。',
  icons: {
    icon: '/favicon.png',
  },
  metadataBase: new URL('https://cares.carespace.jp'),
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: 'Cares — みんなでつくる介護施設ノート',
    title: 'Cares — みんなでつくる介護施設ノート',
    description: '全国18万件の介護事業所の空き状況・料金・専門職メモをみんなで共有。施設探しをもっとかんたんに。',
    url: 'https://cares.carespace.jp',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cares — みんなでつくる介護施設ノート',
    description: '全国18万件の介護事業所の空き状況・料金・専門職メモをみんなで共有。施設探しをもっとかんたんに。',
  },
  alternates: {
    canonical: 'https://cares.carespace.jp',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Cares" className="h-10 sm:h-12" />
              <span className="text-sm sm:text-base font-bold text-cares-600 whitespace-nowrap">みんなでつくる介護施設ノート</span>
            </a>
            <nav className="flex items-center gap-3 sm:gap-4 text-sm">
              <a
                href="/for-business"
                className="text-gray-500 hover:text-cares-600 font-medium"
              >
                <span className="hidden sm:inline">掲載をご希望の方はこちら</span>
                <span className="sm:hidden">施設掲載</span>
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
              <a href="/for-business" className="hover:text-cares-600 transition-colors">施設掲載</a>
            </div>
            <p>&copy; {new Date().getFullYear()} 株式会社CARESPACE</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
