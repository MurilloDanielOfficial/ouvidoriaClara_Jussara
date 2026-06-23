import { apiGet, apiPost } from '../utils/api'
import type { Endereco, Logradouro } from '../types'

export async function getRegiao(rua: string, bairro?: string): Promise<Logradouro> {
  const params = new URLSearchParams()
  params.set('rua', rua)
  if (bairro) params.set('bairro', bairro)
  return apiGet<Logradouro>(`/getRegiao?${params.toString()}`)
}

export async function getAllEnderecos(): Promise<Logradouro[]> {
  const res = await apiGet<{ enderecos: Logradouro[] }>('/enderecos')
  return res.enderecos ?? []
}

export async function cadastrarEnderecos(enderecos: Endereco[]): Promise<void> {
  await apiPost<void>('/cadastrarEnderecos', enderecos)
}
