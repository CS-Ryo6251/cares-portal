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
    // Remove prefecture prefix + trim whitespace (full-width & half-width)
    const afterPref = row.address.replace(/^.+?[県都府道]/, '').replace(/^[\s\u3000]+/, '')
    // Try 郡+町/村 first (e.g. 西村山郡大江町, 丹生郡越前町)
    let match = afterPref.match(/^(.+?郡.+?[町村])/)
    if (!match) {
      // Then try 市 or 区 (e.g. 天童市, 渋谷区)
      match = afterPref.match(/^(.+?[市区])/)
    }
    if (match) {
      citySet.add(match[1])
    }
  }

  const cities = Array.from(citySet).sort()

  return NextResponse.json({ cities })
}
