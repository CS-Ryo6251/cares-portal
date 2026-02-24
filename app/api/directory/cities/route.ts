import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const prefecture = request.nextUrl.searchParams.get('prefecture')

  if (!prefecture) {
    return NextResponse.json({ cities: [] })
  }

  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('cares_listings')
    .select('address')
    .ilike('address', `${prefecture}%`)
    .not('address', 'is', null)
    .limit(10000)

  if (error) {
    return NextResponse.json({ cities: [] })
  }

  // Extract city/ward/town names from addresses
  const citySet = new Set<string>()
  for (const row of data || []) {
    if (!row.address) continue
    // Remove prefecture prefix, then match city (市), ward (区), town (町), village (村)
    // Handle: 郡+町/村 pattern (e.g. 丹生郡越前町)
    const afterPref = row.address.replace(/^.+?[県都府道]/, '')
    const match = afterPref.match(/^(.+?[市区町村])/)
    if (match) {
      citySet.add(match[1])
    }
  }

  const cities = Array.from(citySet).sort()

  return NextResponse.json({ cities })
}
