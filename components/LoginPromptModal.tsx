'use client'

import { X, Lock, Heart, Bell, BarChart3 } from 'lucide-react'

interface LoginPromptModalProps {
  isOpen: boolean
  onClose: () => void
  variant?: 'notes' | 'favorite' | 'default'
}

const VARIANTS = {
  notes: {
    icon: Lock,
    title: '専門職メモをもっと見るには',
    subtitle: 'アカウント登録が必要です',
  },
  favorite: {
    icon: Heart,
    title: 'お気に入りに登録するには',
    subtitle: 'ログインが必要です',
  },
  default: {
    icon: Lock,
    title: 'この機能を使うには',
    subtitle: 'ログインが必要です',
  },
}

export default function LoginPromptModal({ isOpen, onClose, variant = 'default' }: LoginPromptModalProps) {
  if (!isOpen) return null

  const config = VARIANTS[variant]
  const Icon = config.icon
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white w-full sm:w-[420px] max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 sm:p-8 animate-slide-in-right">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon className="w-7 h-7 text-gray-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{config.title}</h2>
          <p className="text-sm text-gray-500">{config.subtitle}</p>
        </div>

        <div className="space-y-2.5 mb-6">
          {[
            { icon: Lock, text: '専門職メモを無制限に閲覧' },
            { icon: Heart, text: 'お気に入り施設を保存' },
            { icon: Bell, text: '空き情報の変更通知を受け取る' },
            { icon: BarChart3, text: '施設を比較できる' },
          ].map(({ icon: ItemIcon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-gray-600">
              <ItemIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{text}</span>
            </div>
          ))}
        </div>

        <a
          href={`/signup?redirect=${encodeURIComponent(currentPath)}`}
          className="block w-full py-3 bg-gray-800 text-white rounded-xl text-base font-medium text-center hover:bg-gray-700 transition-colors"
        >
          無料で登録する
        </a>

        <p className="mt-3 text-center text-sm text-gray-500">
          すでにアカウントをお持ちの方{' '}
          <a href={`/login?redirect=${encodeURIComponent(currentPath)}`} className="text-gray-700 font-medium hover:underline">
            ログイン
          </a>
        </p>
      </div>
    </div>
  )
}
