// ============================================================
// 共通定数 — 全コンポーネント・APIで共有
// ============================================================

// ---------- 施設種別ラベル ----------

export const facilityTypeLabels: Record<string, string> = {
  訪問介護: '訪問介護',
  訪問入浴介護: '訪問入浴',
  訪問看護: '訪問看護',
  訪問リハビリテーション: '訪問リハ',
  通所介護: 'デイサービス',
  '通所介護（療養通所介護）': '療養通所',
  通所リハビリテーション: '通所リハ',
  短期入所生活介護: 'ショートステイ',
  '短期入所療養介護（介護老人保健施設）': 'SS(老健)',
  '短期入所療養介護（介護療養型医療施設）': 'SS(療養)',
  '短期入所療養介護（介護医療院）': 'SS(医療院)',
  認知症対応型共同生活介護: 'グループホーム',
  '特定施設入居者生活介護（有料老人ホーム）': '有料老人ホーム',
  '特定施設入居者生活介護（軽費老人ホーム）': '軽費老人ホーム',
  '特定施設入居者生活介護（サービス付き高齢者向け住宅）': 'サ高住',
  福祉用具貸与: '福祉用具貸与',
  特定福祉用具販売: '福祉用具販売',
  居宅介護支援: '居宅介護支援',
  介護老人福祉施設: '特養',
  介護老人保健施設: '老健',
  介護療養型医療施設: '介護療養型',
  介護医療院: '介護医療院',
  地域密着型介護老人福祉施設入所者生活介護: '地域密着型特養',
  夜間対応型訪問介護: '夜間訪問介護',
  認知症対応型通所介護: '認知症デイ',
  小規模多機能型居宅介護: '小規模多機能',
  '定期巡回・随時対応型訪問介護看護': '定期巡回',
  看護小規模多機能型居宅介護: '看多機',
  地域密着型通所介護: '地域密着デイ',
  地域包括支援センター: '地域包括',
  居宅介護支援事業所: '居宅介護支援',
  特別養護老人ホーム: '特養',
  グループホーム: 'グループホーム',
  有料老人ホーム: '有料老人ホーム',
  サービス付き高齢者向け住宅: 'サ高住',
}

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

// ---------- サービス種別リスト ----------

export const serviceTypes = [
  '訪問介護',
  '訪問看護',
  '通所介護',
  '短期入所生活介護',
  '居宅介護支援',
  '特定施設入居者生活介護',
  '認知症対応型共同生活介護',
  '介護老人福祉施設',
  '介護老人保健施設',
  '介護医療院',
  '小規模多機能型居宅介護',
  '看護小規模多機能型居宅介護',
  '定期巡回・随時対応型訪問介護看護',
  '地域密着型通所介護',
  '夜間対応型訪問介護',
  '福祉用具貸与',
  '訪問リハビリテーション',
  '通所リハビリテーション',
  '訪問入浴介護',
] as const

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
