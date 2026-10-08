import { sharedList } from '@/lib/personal-lists-server'
import { IntakeError, intakeFailure, intakeResponse } from '@/lib/intake-server'
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const list = await sharedList((await params).token)
    if (!list) throw new IntakeError('共有が停止されたか、リストが見つかりません。', 404)
    return intakeResponse(list)
  } catch (error) { return intakeFailure(error) }
}
