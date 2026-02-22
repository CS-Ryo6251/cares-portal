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
        {/* ヘッダー */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-cares-600">Cares</span>
              <span className="text-xs text-gray-400 hidden sm:inline">介護施設情報ポータル</span>
            </a>
            <nav className="flex items-center gap-4 text-sm">
              <a href="/" className="text-gray-600 hover:text-gray-900">施設を探す</a>
              <a
                href="https://app.carespace.jp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cares-600 font-medium hover:text-cares-700"
              >
                事業所の方はこちら
              </a>
            </nav>
          </div>
        </header>

        <main className="min-h-screen">{children}</main>

        {/* フッター */}
        <footer className="bg-gray-900 text-gray-400 py-8">
          <div className="max-w-6xl mx-auto px-4 text-center text-sm">
            <p>Cares は CareSpace OS を利用する介護事業所の情報を掲載しています</p>
            <p className="mt-2">&copy; {new Date().getFullYear()} 株式会社CARESPACE</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
