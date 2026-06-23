import { apiGet } from '../utils/api'
import type { Stat } from '../types'

export async function getStats(): Promise<Stat> {
  return apiGet<Stat>('/stats')
}
