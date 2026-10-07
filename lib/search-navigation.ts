/** Keep existing search bookmarks on the single facility-search screen. */
export function unifiedSearchUrl(input: Record<string, string | string[] | undefined>) {
  const first = (key: string) => Array.isArray(input[key]) ? input[key][0] : input[key]
  const params = new URLSearchParams()
  for (const key of ['q', 'service_type', 'status', 'lat', 'lng', 'page']) {
    const value = first(key)
    if (value) params.set(key, value)
  }
  const area = first('area') || first('prefecture')
  if (area) params.set('area', area)
  return params.size ? `/?${params.toString()}` : '/'
}
