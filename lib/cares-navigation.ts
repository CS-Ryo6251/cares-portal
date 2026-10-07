export const CARESPACE_MANAGEMENT_URL = 'https://app.carespace.jp/cares-management'
export const CARESPACE_SIGNUP_URL = 'https://app.carespace.jp/signup/new-organization?source=cares'

export function facilityManagementUrl(facilityId: string, section: 'overview' | 'fees' | 'posts' = 'overview') {
  const url = new URL(CARESPACE_MANAGEMENT_URL)
  url.searchParams.set('facility_id', facilityId)
  url.searchParams.set('cares_section', section)
  return url.toString()
}
