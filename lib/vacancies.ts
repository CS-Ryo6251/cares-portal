import { getSupabaseClient } from './supabase'
import { currentVacancy, type VacancyReport } from './community'

export async function getCurrentVacancies(ids: string[]) {
  if (!ids.length) return {} as Record<string, VacancyReport | null>
  // Latest report per listing in the database: no global row-limit truncation.
  const { data, error } = await getSupabaseClient().from('cares_latest_vacancies')
    .select('listing_id,vacancy_type,information_source,confirmed_on,valid_until,reported_at,comment').in('listing_id', ids)
  if (error) return null
  return Object.fromEntries((data || []).map(row => [row.listing_id, currentVacancy([row])])) as Record<string, VacancyReport | null>
}
