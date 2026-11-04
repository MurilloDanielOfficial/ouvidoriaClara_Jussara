import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'
import type { LeadsResponse, Cliente, ContatoUnificado } from '../types'

// Resposta do endpoint /contatos-unificados (join server-side de contatos, cliente,
// clientesbloqueados e reclamacao). Campos nullable vêm como string | null do back-end.
interface ContatosUnificadosResponse {
  contatos: Array<{
    telefone: string
    nome: string | null
    cidade: string | null
    endereco: string | null
    bairro: string | null
    dataNascimento: string | null
    dataCriacao: string | null
    conversationId: string | null
    instance: string | null
    campanha: string | null
    leadAtivo: boolean
    darwinAtivo: boolean
    isGelado: boolean
    isCliente: boolean
    hasReclamacao: boolean
  }>
  total: number
  limite: number
  usados: number
  ocupacao: string
}

export interface FiltroContatosUnificados {
  search?: string
  darwin?: boolean | null
  leadAtivo?: boolean | null
  gelo?: boolean | null
  reclamacao?: boolean | null
  inicio?: string
  fim?: string
}

export async function getAllContatosUnificados(
  limit = 12,
  offset = 0,
  filtro?: FiltroContatosUnificados,
): Promise<{ contatos: ContatoUnificado[]; total: number; usados: number; ocupacao: string; limite: number }> {
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  if (filtro) {
    if (filtro.search) params.set('search', filtro.search)
    if (filtro.darwin !== null && filtro.darwin !== undefined) params.set('darwin', String(filtro.darwin))
    if (filtro.leadAtivo !== null && filtro.leadAtivo !== undefined) params.set('leadAtivo', String(filtro.leadAtivo))
    if (filtro.gelo !== null && filtro.gelo !== undefined) params.set('gelo', String(filtro.gelo))
    if (filtro.reclamacao !== null && filtro.reclamacao !== undefined) params.set('reclamacao', String(filtro.reclamacao))
    if (filtro.inicio) params.set('inicio', filtro.inicio)
    if (filtro.fim) params.set('fim', filtro.fim)
  }
  const res = await apiGet<ContatosUnificadosResponse>(`/contatos-unificados?${params.toString()}`)

  const contatos: ContatoUnificado[] = (res.contatos || []).map((c) => ({
    telefone: c.telefone,
    nome: c.nome || c.telefone,
    cidade: c.cidade || undefined,
    endereco: c.endereco || undefined,
    bairro: c.bairro || undefined,
    dataNascimento: c.dataNascimento || undefined,
    dataCriacao: c.dataCriacao || undefined,
    conversationId: c.conversationId,
    instance: c.instance,
    campanha: c.campanha,
    leadAtivo: c.leadAtivo,
    darwinAtivo: c.darwinAtivo,
    isGelado: c.isGelado,
    isCliente: c.isCliente,
    hasReclamacao: c.hasReclamacao,
  }))

  return {
    contatos,
    total: res.total ?? contatos.length,
    usados: res.usados ?? contatos.filter((c) => c.leadAtivo).length,
    ocupacao: res.ocupacao ?? '0/0',
    limite: res.limite ?? 0,
  }
}

/* Busca a base INTEIRA de contatos unificados em páginas paralelas.
   getAllContatosUnificados(0, 0) sem LIMIT serializa a base toda num único
   request — com ~90 mil contatos isso leva quase 1 minuto e ~30 MB. Paginar
   em blocos de 10 mil com 4 requisições concorrentes cai para ~10 s. */
const CONTATOS_PAGINA = 10_000
const CONTATOS_CONCORRENCIA = 4

export async function getTodosContatosUnificados(): Promise<{
  contatos: ContatoUnificado[]
  total: number
  usados: number
  ocupacao: string
  limite: number
}> {
  const primeira = await getAllContatosUnificados(CONTATOS_PAGINA, 0)
  const paginas = Math.ceil(Math.max(0, primeira.total - primeira.contatos.length) / CONTATOS_PAGINA)
  if (paginas === 0) return primeira
  const resto: ContatoUnificado[] = []
  for (let i = 0; i < paginas; i += CONTATOS_CONCORRENCIA) {
    const lote = await Promise.all(
      Array.from({ length: Math.min(CONTATOS_CONCORRENCIA, paginas - i) }, (_, j) =>
        getAllContatosUnificados(CONTATOS_PAGINA, (i + j + 1) * CONTATOS_PAGINA),
      ),
    )
    for (const r of lote) resto.push(...r.contatos)
  }
  return { ...primeira, contatos: [...primeira.contatos, ...resto] }
}

export async function ativarLead(telefone: string): Promise<void> {
  await apiPut<void>(`/leads/ativar/${telefone}`, {})
}

// Versão leve para refresh do summary: busca só /leads (1 request) em vez de
// getAllContatosUnificados. Usado após toggle de Darwin.
export async function getLeadsSummary(): Promise<{ total: number; usados: number; ocupacao: string; limite: number }> {
  const leadsRes = await apiGet<LeadsResponse>('/leads?limit=0&offset=0')
  return {
    total: leadsRes.total ?? 0,
    usados: leadsRes.usados ?? 0,
    ocupacao: leadsRes.ocupacao ?? '0/0',
    limite: leadsRes.limite ?? 0,
  }
}

export async function desativarLead(telefone: string): Promise<void> {
  await apiDelete<void>(`/leads/${telefone}`)
}

export async function ligarRobo(telefone: string): Promise<void> {
  await apiDelete<void>(`/ligar/${telefone}`)
}

export async function desligarRobo(telefone: string): Promise<void> {
  await apiPost<void>(`/desligar/${telefone}`, {})
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
