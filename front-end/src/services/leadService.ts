import { apiGet, apiPut, apiDelete } from '../utils/api'
import type { LeadsResponse } from '../types'

export async function getAllLeads(): Promise<LeadsResponse> {
  return apiGet<LeadsResponse>('/leads')
}

export async function ativarLead(telefone: string): Promise<void> {
  await apiPut<void>(`/leads/ativar/${telefone}`, {})
}

export async function desativarLead(telefone: string): Promise<void> {
  await apiDelete<void>(`/leads/${telefone}`)
}
