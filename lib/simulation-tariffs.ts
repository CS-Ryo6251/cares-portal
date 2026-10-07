import catalog from '@/data/simulation-tariffs-2026-06.json'
import type { Tariff } from './fee-calculation'

const prefixes: Record<string,string> = {
  訪問介護:'11', 訪問入浴介護:'12', 訪問看護:'13', 訪問リハビリテーション:'14',
  通所介護:'15', 通所リハビリテーション:'16', 地域密着型通所介護:'78',
}
/** Server selects only the known service; private OS/client records are never queried. */
export function simulationTariffs(serviceType: string | null | undefined): Tariff[] {
  const prefix = prefixes[serviceType || '']
  return prefix ? catalog.rows.filter(r => r.code.startsWith(prefix)) : []
}
