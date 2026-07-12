export interface PublicServiceCase {
  id: string
  title: string
  caseType: 'searchUsers' | 'dischargeCoordination' | 'searchCareManager'
  area: string
  serviceTypes: string[]
  clientSummary: string
  careLevel: string
  createdAt: string
}

export async function getPublicServiceCases(filters: {
  q?: string
  area?: string
  serviceType?: string
}): Promise<{ cases: PublicServiceCase[]; unavailable: boolean }> {
  const baseUrl = process.env.CARESPACE_OS_URL || 'https://app.carespace.jp'
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.area) params.set('area', filters.area)
  if (filters.serviceType) params.set('service_type', filters.serviceType)

  try {
    const response = await fetch(`${baseUrl}/api/cares/cases?${params.toString()}`, {
      next: { revalidate: 60 },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const payload = await response.json()
    return { cases: Array.isArray(payload.cases) ? payload.cases : [], unavailable: false }
  } catch (error) {
    console.error('公開案件取得エラー:', error)
    return { cases: [], unavailable: true }
  }
}
