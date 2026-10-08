import { FACILITY_TYPES, FACILITY_TYPES_BY_CATEGORY } from './carespace-service-types'

export const serviceTypes = FACILITY_TYPES
export const serviceTypeGroups = FACILITY_TYPES_BY_CATEGORY

// Only equivalent names are joined. Related services (e.g. 通所介護 and 地域密着型通所介護)
// and residential facilities with/without 特定施設 designation remain separate.
const equivalents: readonly (readonly string[])[] = [
  ['居宅介護支援', '居宅介護支援事業所', 'ケアマネ'],
  ['通所介護', 'デイサービス'],
  ['通所介護（療養通所介護）', '療養通所介護'],
  ['通所リハビリテーション', 'デイケア', '通所リハ'],
  ['介護老人福祉施設', '特別養護老人ホーム', '特養'],
  ['介護老人保健施設', '老健'],
  ['認知症対応型共同生活介護', 'グループホーム'],
  ['短期入所生活介護', 'ショートステイ'],
  ['訪問看護', '訪問看護ステーション', '訪看'],
  ['訪問リハビリテーション', '訪リハ', '訪問リハ'],
  ['訪問入浴介護', '訪問入浴'],
  ['サービス付き高齢者向け住宅', 'サ高住'],
]

const shortLabels: Record<string, string> = {
  訪問入浴介護: '訪問入浴', 訪問リハビリテーション: '訪問リハ', 通所介護: 'デイサービス',
  '通所介護（療養通所介護）': '療養通所', 通所リハビリテーション: '通所リハ',
  短期入所生活介護: 'ショートステイ',
  '短期入所療養介護（介護老人保健施設）': 'SS(老健)',
  '短期入所療養介護（介護療養型医療施設）': 'SS(療養)',
  '短期入所療養介護（介護医療院）': 'SS(医療院)',
  認知症対応型共同生活介護: 'グループホーム',
  '特定施設入居者生活介護（有料老人ホーム）': '有料老人ホーム（特定施設）',
  '特定施設入居者生活介護（軽費老人ホーム）': '軽費老人ホーム（特定施設）',
  '特定施設入居者生活介護（サービス付き高齢者向け住宅）': 'サ高住（特定施設）',
  特定福祉用具販売: '福祉用具販売', 介護老人福祉施設: '特養', 介護老人保健施設: '老健',
  介護療養型医療施設: '介護療養型', 地域密着型介護老人福祉施設入所者生活介護: '地域密着型特養',
  夜間対応型訪問介護: '夜間訪問介護', 認知症対応型通所介護: '認知症デイ',
  小規模多機能型居宅介護: '小規模多機能', '定期巡回・随時対応型訪問介護看護': '定期巡回',
  看護小規模多機能型居宅介護: '看多機', 地域密着型通所介護: '地域密着デイ',
  地域包括支援センター: '地域包括', サービス付き高齢者向け住宅: 'サ高住',
}
// Keep legacy unspecified 特定施設 records selectable without guessing their subtype.
export const legacyServiceTypes = ['特定施設入居者生活介護'] as const
export const facilityTypeLabels: Record<string, string> = Object.fromEntries([
  ...serviceTypes.map(type => [type, shortLabels[type] || type]),
  ...equivalents.flatMap(group => group.slice(1).map(type => [type, shortLabels[group[0]] || group[0]])),
  ...legacyServiceTypes.map(type => [type, type]),
])
export function isKnownServiceType(value: string) { return Object.hasOwn(facilityTypeLabels, value) }
export function serviceTypeValues(value: string): string[] {
  return [...(equivalents.find(group => group.includes(value)) || [value])]
}
export function registrationServiceType(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const type = value.trim()
  if ((serviceTypes as readonly string[]).includes(type)) return type
  return equivalents.find(group => group.includes(type))?.[0] || null
}
