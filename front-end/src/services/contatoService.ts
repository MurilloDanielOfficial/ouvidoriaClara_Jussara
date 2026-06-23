import { apiGet } from '../utils/api'
import type { Contato } from '../types'

export async function getAllContatos(): Promise<Contato[]> {
  return apiGet<Contato[]>('/contatos')
}

export async function getContatoByTelefone(telefone: string): Promise<Contato> {
  return apiGet<Contato>(`/contatos/${telefone}`)
}
