import catalog from '@/data/provider-simulation-catalog.json'

export type ProviderSimulationSettings = {
  revision: '2026-06'; service_type: string; group: string | null; area: string | null
  addons: Record<string, string>; effective_from: string; effective_to: string; confirmed_at?: string
}
type Service = { prefix: string; user_selects_service: boolean; groups: string[]; addons: { code: string; name: string; group: string; rate: number | null }[] }
export function providerService(serviceType: string): Service | undefined {
  return Object.prototype.hasOwnProperty.call(catalog.services, serviceType) ? (catalog.services as Record<string, Service>)[serviceType] : undefined
}
export const regionChoices = [...Array.from({ length: 7 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}級地` })), { value: 'other', label: 'その他' }]
export function regionLabel(area: string | null | undefined) { return regionChoices.find(c => c.value === area)?.label || '未登録・事業所に確認' }
export function readProviderSettings(value: unknown, serviceType: string): ProviderSimulationSettings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const x = value as Record<string, unknown>, service = providerService(serviceType)
  const month = (v: unknown): v is string => typeof v === 'string' && /^202[67]-(0[1-9]|1[0-2])$/.test(v) && v >= '2026-06' && v <= '2027-03'
  if (!service || x.revision !== '2026-06' || x.service_type !== serviceType
    || !(x.group === null || (!service.user_selects_service && typeof x.group === 'string' && service.groups.includes(x.group)))
    || !(x.area === null || regionChoices.some(c => c.value === x.area))
    || !month(x.effective_from) || !month(x.effective_to) || x.effective_from > x.effective_to
    || !x.addons || typeof x.addons !== 'object' || Array.isArray(x.addons)) return null
  const addons: Record<string, string> = {}
  for (const [group, code] of Object.entries(x.addons)) {
    if (!service.addons.some(a => a.group === group) || typeof code !== 'string'
      || (code !== 'none' && !service.addons.some(a => a.group === group && a.code === code))) return null
    addons[group] = code
  }
  return { revision: '2026-06', service_type: serviceType, group: x.group as string | null, area: x.area as string | null, addons,
    effective_from: x.effective_from, effective_to: x.effective_to,
    ...(typeof x.confirmed_at === 'string' && Number.isFinite(Date.parse(x.confirmed_at)) ? { confirmed_at: x.confirmed_at } : {}) }
}
export function applicableProviderSettings(value: unknown, serviceType: string, month: string) {
  const settings = readProviderSettings(value, serviceType)
  return settings && month >= settings.effective_from && month <= settings.effective_to ? settings : null
}
