'use client'

export default function PostError({ reset }: { reset: () => void }) {
  return <div role="alert" className="mx-auto max-w-xl p-8 text-center">
    <h1 className="text-lg font-bold">投稿を読み込めませんでした</h1>
    <p className="mt-2 text-sm text-slate-600">時間をおいて、もう一度お試しください。</p>
    <button onClick={reset} className="mt-4 min-h-12 rounded-full bg-rose-600 px-6 font-bold text-white">再読み込み</button>
  </div>
}
