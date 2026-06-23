import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'
import type { Ocorrencia, OcorrenciaRequest, OcorrenciaUpdateRequest } from '../types'

export async function aprovarInquerito(id: number): Promise<void> {
  await apiPost<void>(`/aprovar/${id}`, {})
}

export async function aprovarRequerimento(id: number): Promise<void> {
  await apiPost<void>(`/aprovar/requerimento/${id}`, {})
}

export async function aprovarComoAmbos(id: number): Promise<void> {
  await apiPost<void>(`/indicreq/${id}`, {})
}

export async function reprovarInquerito(id: number): Promise<void> {
  await apiPost<void>(`/reprovar/${id}`, {})
}

export async function colocarEmAnalise(id: number): Promise<void> {
  await apiPost<void>(`/analise/${id}`, {})
}

export async function colocarComoCriado(id: number): Promise<void> {
  await apiPost<void>(`/criado/${id}`, {})
}

export async function getAllOcorrencias(telefone?: string): Promise<Ocorrencia[]> {
  const query = telefone ? `?telefone=${telefone}` : ''
  return apiGet<Ocorrencia[]>(`/ocorrencias${query}`)
}

export async function getOcorrenciaById(id: number): Promise<Ocorrencia> {
  return apiGet<Ocorrencia>(`/ocorrencia/${id}`)
}

export async function createOcorrencia(data: OcorrenciaRequest): Promise<{ message: string; id: number }> {
  return apiPost<{ message: string; id: number }>('/ocorrencia', data)
}

export async function updateOcorrencia(id: number, data: OcorrenciaUpdateRequest): Promise<void> {
  await apiPut<void>(`/ocorrencia/${id}`, data)
}

export async function deleteOcorrencia(id: number): Promise<void> {
  await apiDelete<void>(`/ocorrencia/${id}`)
}
