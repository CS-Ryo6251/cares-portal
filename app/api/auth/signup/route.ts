import { NextResponse } from 'next/server'

/** Account creation belongs to OS membership registration; old clients cannot create Cares-only users. */
export async function POST() {
  return NextResponse.json({
    code: 'OS_REGISTRATION_REQUIRED',
    error: 'CaresとCareSpace OSの登録は共通です。介護・医療・福祉の関係者の方は、CareSpace OSで職種と所属事業所を登録してください。',
    redirectUrl: 'https://app.carespace.jp/signup?source=cares',
  }, { status: 410, headers: { 'Cache-Control': 'no-store' } })
}
