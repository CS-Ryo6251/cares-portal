// ============================================================
// 共通定数 — 全コンポーネント・APIで共有
// ============================================================

// ---------- 施設種別ラベル ----------

export { facilityTypeLabels, serviceTypes } from './service-types'

// ---------- 受入状況 ----------

export const acceptanceStatusMap: Record<string, { label: string; color: string }> = {
  accepting: { label: '受入可能', color: 'bg-green-100 text-green-700' },
  limited: { label: '条件付き', color: 'bg-yellow-100 text-yellow-700' },
  waitlist: { label: '待機あり', color: 'bg-orange-100 text-orange-700' },
  not_accepting: { label: '受入停止中', color: 'bg-red-100 text-red-700' },
  unknown: { label: '要問合せ', color: 'bg-gray-100 text-gray-600' },
}

// PostCard用: 空き情報投稿のステータスも含む
export const vacancyStatusMap: Record<string, { label: string; color: string }> = {
  ...acceptanceStatusMap,
  has_vacancy: { label: '空きあり', color: 'bg-green-100 text-green-700' },
  no_vacancy: { label: '空きなし', color: 'bg-red-100 text-red-700' },
}

// ---------- 都道府県 ----------

export const prefectures = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県',
  '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
] as const

// ---------- 投稿カテゴリ ----------

export const postCategoryLabels: Record<string, { label: string; color: string }> = {
  daily: { label: '日常', color: 'bg-green-100 text-green-700' },
  notice: { label: 'お知らせ', color: 'bg-blue-100 text-blue-700' },
  recruitment: { label: '求人', color: 'bg-purple-100 text-purple-700' },
  event: { label: 'イベント', color: 'bg-orange-100 text-orange-700' },
  volunteer: { label: 'ボランティア', color: 'bg-teal-100 text-teal-700' },
  availability: { label: '空き情報', color: 'bg-emerald-100 text-emerald-700' },
  staff: { label: 'スタッフ紹介', color: 'bg-pink-100 text-pink-700' },
  training: { label: 'イベント', color: 'bg-orange-100 text-orange-700' },
  other: { label: 'その他', color: 'bg-gray-100 text-gray-700' },
}

// ---------- 専門職種 ----------

export const reporterTypeLabels: Record<string, string> = {
  care_manager: 'ケアマネ',
  msw: 'MSW',
  nurse: '看護師',
  therapist: 'PT/OT/ST',
  counselor: '相談員',
  doctor: '医師',
  other: 'その他',
}

// ---------- 日付フォーマット ----------

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'たった今'
  if (diffMinutes < 60) return `${diffMinutes}分前`
  if (diffHours < 24) return `${diffHours}時間前`
  if (diffDays < 7) return `${diffDays}日前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`

  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
