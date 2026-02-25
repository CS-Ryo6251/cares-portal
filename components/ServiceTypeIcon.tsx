import { Building2, Home, Heart, Stethoscope, Users, HandHelping, Truck, Armchair, ClipboardList } from 'lucide-react'

// サービス種別 → アイコン + カラー
const SERVICE_TYPE_MAP: Record<string, { icon: string; bg: string; text: string; border: string }> = {
  // 訪問系 — ブルー
  訪問介護:           { icon: 'truck',    bg: 'bg-blue-50',    text: 'text-blue-500',    border: 'border-blue-100' },
  訪問入浴介護:       { icon: 'truck',    bg: 'bg-blue-50',    text: 'text-blue-500',    border: 'border-blue-100' },
  訪問看護:           { icon: 'stethoscope', bg: 'bg-blue-50', text: 'text-blue-500',    border: 'border-blue-100' },
  訪問リハビリテーション: { icon: 'stethoscope', bg: 'bg-blue-50', text: 'text-blue-500', border: 'border-blue-100' },

  // 通所系 — グリーン
  通所介護:           { icon: 'users',    bg: 'bg-green-50',   text: 'text-green-500',   border: 'border-green-100' },
  地域密着型通所介護:  { icon: 'users',    bg: 'bg-green-50',   text: 'text-green-500',   border: 'border-green-100' },
  認知症対応型通所介護: { icon: 'users',   bg: 'bg-green-50',   text: 'text-green-500',   border: 'border-green-100' },
  通所リハビリテーション: { icon: 'stethoscope', bg: 'bg-green-50', text: 'text-green-500', border: 'border-green-100' },
  '通所介護（療養通所介護）': { icon: 'stethoscope', bg: 'bg-green-50', text: 'text-green-500', border: 'border-green-100' },

  // 入所系 — パープル
  特別養護老人ホーム:  { icon: 'building', bg: 'bg-purple-50',  text: 'text-purple-500',  border: 'border-purple-100' },
  介護老人福祉施設:    { icon: 'building', bg: 'bg-purple-50',  text: 'text-purple-500',  border: 'border-purple-100' },
  介護老人保健施設:    { icon: 'building', bg: 'bg-purple-50',  text: 'text-purple-500',  border: 'border-purple-100' },
  介護療養型医療施設:  { icon: 'building', bg: 'bg-purple-50',  text: 'text-purple-500',  border: 'border-purple-100' },
  介護医療院:          { icon: 'building', bg: 'bg-purple-50',  text: 'text-purple-500',  border: 'border-purple-100' },
  地域密着型介護老人福祉施設入所者生活介護: { icon: 'building', bg: 'bg-purple-50', text: 'text-purple-500', border: 'border-purple-100' },

  // GH・有料・サ高住 — アンバー
  認知症対応型共同生活介護: { icon: 'home', bg: 'bg-amber-50',  text: 'text-amber-500',   border: 'border-amber-100' },
  グループホーム:      { icon: 'home',     bg: 'bg-amber-50',   text: 'text-amber-500',   border: 'border-amber-100' },
  '特定施設入居者生活介護（有料老人ホーム）': { icon: 'home', bg: 'bg-amber-50', text: 'text-amber-500', border: 'border-amber-100' },
  '特定施設入居者生活介護（軽費老人ホーム）': { icon: 'home', bg: 'bg-amber-50', text: 'text-amber-500', border: 'border-amber-100' },
  '特定施設入居者生活介護（サービス付き高齢者向け住宅）': { icon: 'home', bg: 'bg-amber-50', text: 'text-amber-500', border: 'border-amber-100' },
  有料老人ホーム:      { icon: 'home',     bg: 'bg-amber-50',   text: 'text-amber-500',   border: 'border-amber-100' },
  サービス付き高齢者向け住宅: { icon: 'home', bg: 'bg-amber-50', text: 'text-amber-500', border: 'border-amber-100' },

  // ショートステイ — ティール
  短期入所生活介護:    { icon: 'armchair', bg: 'bg-teal-50',    text: 'text-teal-500',    border: 'border-teal-100' },
  '短期入所療養介護（介護老人保健施設）': { icon: 'armchair', bg: 'bg-teal-50', text: 'text-teal-500', border: 'border-teal-100' },
  '短期入所療養介護（介護療養型医療施設）': { icon: 'armchair', bg: 'bg-teal-50', text: 'text-teal-500', border: 'border-teal-100' },
  '短期入所療養介護（介護医療院）': { icon: 'armchair', bg: 'bg-teal-50', text: 'text-teal-500', border: 'border-teal-100' },

  // 居宅介護支援 — ローズ
  居宅介護支援:        { icon: 'clipboard', bg: 'bg-rose-50',   text: 'text-rose-500',    border: 'border-rose-100' },
  居宅介護支援事業所:  { icon: 'clipboard', bg: 'bg-rose-50',   text: 'text-rose-500',    border: 'border-rose-100' },

  // 多機能系 — インディゴ
  小規模多機能型居宅介護: { icon: 'hand',  bg: 'bg-indigo-50',  text: 'text-indigo-500',  border: 'border-indigo-100' },
  看護小規模多機能型居宅介護: { icon: 'hand', bg: 'bg-indigo-50', text: 'text-indigo-500', border: 'border-indigo-100' },
  '定期巡回・随時対応型訪問介護看護': { icon: 'truck', bg: 'bg-indigo-50', text: 'text-indigo-500', border: 'border-indigo-100' },
  夜間対応型訪問介護:  { icon: 'truck',    bg: 'bg-indigo-50',  text: 'text-indigo-500',  border: 'border-indigo-100' },

  // 地域包括・福祉用具 — グレー
  地域包括支援センター: { icon: 'heart',   bg: 'bg-sky-50',     text: 'text-sky-500',     border: 'border-sky-100' },
  福祉用具貸与:        { icon: 'building', bg: 'bg-gray-50',    text: 'text-gray-500',    border: 'border-gray-200' },
  特定福祉用具販売:    { icon: 'building', bg: 'bg-gray-50',    text: 'text-gray-500',    border: 'border-gray-200' },
}

const DEFAULT_STYLE = { icon: 'building', bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' }

const ICON_COMPONENTS = {
  building: Building2,
  home: Home,
  heart: Heart,
  stethoscope: Stethoscope,
  users: Users,
  hand: HandHelping,
  truck: Truck,
  armchair: Armchair,
  clipboard: ClipboardList,
} as const

type ServiceTypeIconProps = {
  serviceType?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function ServiceTypeIcon({ serviceType, size = 'sm', className = '' }: ServiceTypeIconProps) {
  const style = (serviceType && SERVICE_TYPE_MAP[serviceType]) || DEFAULT_STYLE
  const IconComponent = ICON_COMPONENTS[style.icon as keyof typeof ICON_COMPONENTS] || Building2

  const sizeClasses = {
    sm: 'w-9 h-9 rounded-lg',
    md: 'w-12 h-12 sm:w-16 sm:h-16 rounded-xl',
    lg: 'w-16 h-16 rounded-xl',
  }

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6 sm:w-8 sm:h-8',
    lg: 'w-8 h-8',
  }

  return (
    <span className={`shrink-0 ${sizeClasses[size]} ${style.bg} border ${style.border} flex items-center justify-center ${className}`}>
      <IconComponent className={`${iconSizeClasses[size]} ${style.text}`} />
    </span>
  )
}

// ヘルパー: 外部から色だけ使いたい場合
export function getServiceTypeStyle(serviceType?: string | null) {
  return (serviceType && SERVICE_TYPE_MAP[serviceType]) || DEFAULT_STYLE
}
