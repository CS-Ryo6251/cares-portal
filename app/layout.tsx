import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cares — 介護施設のリアルタイム情報ポータル',
  description: '空き状況・料金・施設の雰囲気がわかる。介護施設を探すならCares。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center">
              <img src="/logo.png" alt="Cares" className="h-9" />
            </a>
            <nav className="flex items-center gap-4 text-sm">
              <a
                href="/for-business"
                className="text-gray-500 hover:text-cares-600 font-medium"
              >
                介護事業所の方はこちら
              </a>
            </nav>
          </div>
        </header>

        <div className="max-w-7xl mx-auto flex">
          {/* Sidebar is rendered by page components (needs searchParams) */}
          <main className="flex-1 min-h-screen">{children}</main>
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-6">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} 株式会社CARESPACE</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
