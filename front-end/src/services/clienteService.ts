import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'
import type { Cliente } from '../types'

export async function getAllClientes(): Promise<Cliente[]> {
  return apiGet<Cliente[]>('/clientes')
}

export async function getClienteByTelefone(telefone: string): Promise<Cliente> {
  return apiGet<Cliente>(`/cliente/${telefone}`)
}

export async function createCliente(cliente: Cliente): Promise<string> {
  return apiPost<string>('/cliente', cliente)
}

export async function updateCliente(telefone: string, cliente: Cliente): Promise<string> {
  return apiPut<string>(`/cliente/${telefone}`, cliente)
}

export async function deleteCliente(telefone: string): Promise<string> {
  return apiDelete<string>(`/cliente/${telefone}`)
}

export async function clienteExiste(telefone: string): Promise<Cliente | false> {
  return apiGet<Cliente | false>(`/cliente/existe/${telefone}`)
}

export async function getClienteAtivo(telefone: string): Promise<boolean> {
  const res = await apiGet<{ ativo: boolean }>(`/busca/cliente/${telefone}`)
  return res.ativo
}

export async function getDadosCliente(telefone: string): Promise<{ nome: string; telefone: string } | null> {
  const res = await apiGet<{ resultado: { nome: string; telefone: string } | null }>(`/busca/dados/${telefone}`)
  return res.resultado
}
