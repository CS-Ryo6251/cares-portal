import { prefectures } from './constants'

type AreaQuery<T> = { eq: (column: string, value: string) => T; ilike: (column: string, pattern: string) => T; or: (filters: string) => T }
const quote = (value: string) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

export function applyDirectoryArea<T extends AreaQuery<T>>(query: T, area?: string): T {
  if (!area) return query
  const [prefecture, cityList] = area.split(':')
  const knownPrefecture = prefectures.some(value => value === prefecture)
  // Public addresses can omit the prefecture (e.g. 山形市…). Use its own column.
  query = knownPrefecture ? query.eq('prefecture', prefecture) : query.ilike('address', `%${prefecture}%`)
  const cities = (cityList || '').split(',').map(city => city.trim()).filter(Boolean)
  if (cities.length) {
    // Keep older listings without a city field discoverable through their address.
    query = query.or(cities.flatMap(city => [`city.eq.${quote(city)}`, `address.ilike.${quote(`%${city}%`)}`]).join(','))
  }
  return query
}
