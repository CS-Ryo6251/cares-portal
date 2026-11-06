import { WELFARE_FACILITY_TYPES_BY_CATEGORY } from './carespace-welfare-service-types'
export const disabilityServiceTypes = Object.entries(WELFARE_FACILITY_TYPES_BY_CATEGORY).filter(([name]) => name.startsWith('障害')).flatMap(([, values]) => [...values])
const disabilityValues = `(${disabilityServiceTypes.map(value => `"${value}"`).join(',')})`
export function applyDirectoryScheme<T extends { eq: (column: string, value: string) => T; or: (filter: string) => T }>(query: T, scheme?: string | null): T {
  if (scheme === 'welfare') return query.or(`source_kind.eq.welfare,service_type.in.${disabilityValues}`)
  if (scheme === 'care') return query.or('source_kind.is.null,source_kind.neq.welfare').or(`service_type.is.null,service_type.not.in.${disabilityValues}`)
  return query
}
export function directorySourceLabel(sourceKind?: string | null, serviceType?: string | null) {
  return sourceKind === 'welfare' ? '障害福祉・障害児（WAM）' : (disabilityServiceTypes as string[]).includes(serviceType || '') ? '障害福祉・障害児' : '介護'
}
