import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'
import { API_BASE_URL } from '../utils/config'
import type { LeadsResponse, Cliente, Contato, ContatoUnificado } from '../types'

export async function getAllContatosUnificados(): Promise<{ contatos: ContatoUnificado[]; total: number; usados: number; ocupacao: string; limite: number }> {
  const [leadsRes, clientes, contatos] = await Promise.all([
    apiGet<LeadsResponse>('/leads'),
    apiGet<Cliente[]>('/clientes').catch(() => [] as Cliente[]),
    apiGet<Contato[]>('/contatos').catch(() => [] as Contato[]),
  ])

  const clientesMap = new Map<string, Cliente>()
  clientes.forEach((c) => { clientesMap.set(c.telefone, c) })

  const contatosMap = new Map<string, Contato>()
  contatos.forEach((c) => { contatosMap.set(c.telefone, c) })

  let geloPhones = new Set<string>()
  try {
    const geloRes = await apiGet<Cliente[]>('/clientes-gelo')
    geloRes.forEach((g) => geloPhones.add(g.telefone))
  } catch {
    // endpoint might not return expected format, try raw fetch
    try {
      const resp = await fetch(`${API_BASE_URL}/clientes-gelo`)
      if (resp.ok) {
        const data = await resp.json()
        const arr = Array.isArray(data) ? data : data?.cliente ?? []
        arr.forEach((g: any) => {
          const tel = g.telefone || g.Telefone
          if (tel) geloPhones.add(tel)
        })
      }
    } catch { /* ignore */ }
  }

  const leads = leadsRes.leads || []

  const darwinStatuses = await Promise.all(
    leads.map(async (lead) => {
      try {
        const resp = await fetch(`${API_BASE_URL}/ligado/${lead.telefone}`)
        if (!resp.ok) return true
        const raw = (await resp.text()).trim().toLowerCase()
        if (raw === 'false') return false
        if (raw === 'true') return true
        try {
          const parsed = JSON.parse(raw)
          if (typeof parsed === 'boolean') return parsed
        } catch { /* ignore */ }
        return true
      } catch {
        return true
      }
    })
  )

  const contatosUnificados: ContatoUnificado[] = leads.map((lead, index) => {
    const cliente = clientesMap.get(lead.telefone)
    const contato = contatosMap.get(lead.telefone)
    const isGelado = geloPhones.has(lead.telefone)

    return {
      telefone: lead.telefone,
      nome: cliente?.nome || lead.nome || lead.telefone,
      cidade: cliente?.cidade,
      endereco: cliente?.endereco,
      bairro: cliente?.bairro,
      dataNascimento: cliente?.dataNascimento,
      dataCriacao: cliente?.dataCriacao || contato?.data_criacao,
      conversationId: contato?.conversationId ?? null,
      instance: contato?.instance ?? null,
      leadAtivo: lead.ativo,
      darwinAtivo: darwinStatuses[index] ?? true,
      isGelado,
      isCliente: !!cliente,
      hasReclamacao: false,
    }
  })

  return {
    contatos: contatosUnificados,
    total: leadsRes.total ?? contatosUnificados.length,
    usados: leadsRes.usados ?? contatosUnificados.filter((c) => c.leadAtivo).length,
    ocupacao: leadsRes.ocupacao ?? `${contatosUnificados.filter((c) => c.darwinAtivo).length}/${leadsRes.limite || 0}`,
    limite: leadsRes.limite ?? 0,
  }
}

export async function ativarLead(telefone: string): Promise<void> {
  await apiPut<void>(`/leads/ativar/${telefone}`, {})
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
