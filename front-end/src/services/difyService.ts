import { apiGet, apiPost, apiDelete } from '../utils/api'
import { API_BASE_URL } from '../utils/config'
import type { ConversaResumo, HistoricoChatResponse, MensagemChat } from '../types'

/**
 * Lista todas as conversas (contatos com histórico no chat),
 * ordenadas pela última mensagem.
 */
export async function listConversas(): Promise<ConversaResumo[]> {
  const res = await apiGet<ConversaResumo[] | { conversas?: ConversaResumo[] } | null>('/chat')
  if (Array.isArray(res)) return res
  if (res && Array.isArray(res.conversas)) return res.conversas
  return []
}

/**
 * Busca o histórico completo de mensagens de um contato pelo telefone.
 */
export async function getHistoricoChat(
  telefone: string,
  signal?: AbortSignal
): Promise<HistoricoChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat/${encodeURIComponent(telefone)}`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Erro ${response.status} ao buscar histórico do chat`)
  }
  return response.json()
}

/**
 * Envia uma mensagem como atendente humano.
 * Automaticamente desliga a IA para ela não falar por cima.
 * Retorna a mensagem criada no histórico.
 */
export async function enviarMensagemAgente(
  telefone: string,
  conteudo: string
): Promise<MensagemChat> {
  return apiPost<MensagemChat>('/chat/mensagem-agente', { telefone, conteudo })
}

/**
 * Envia a mensagem modelo aprovada na Meta (usada com a janela de 24h fechada).
 * Quando o cidadão responder, a janela reabre e o texto livre volta a funcionar.
 */
export async function enviarTemplateRetomada(telefone: string): Promise<MensagemChat> {
  return apiPost<MensagemChat>('/chat/template-agente', { telefone })
}

/**
 * Verifica se a IA está ligada para o contato.
 * Retorna true (ligada) ou false (desligada).
 * O backend retorna texto plano "true"/"false".
 */
export async function getIaLigada(telefone: string): Promise<boolean> {
  const result = await apiGet<string>(`/ligado/${encodeURIComponent(telefone)}`)
  return result === 'true' || result === 'true\n'
}

/**
 * Religa a IA para um contato (remove o bloqueio).
 */
export async function religarIa(telefone: string): Promise<{ valido: boolean; message: string }> {
  return apiDelete<{ valido: boolean; message: string }>(`/ligar/${encodeURIComponent(telefone)}`)
}

/**
 * Desliga a IA para um contato manualmente.
 */
export async function desligarIa(telefone: string): Promise<{ valido: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/desligar/${encodeURIComponent(telefone)}`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Erro ${response.status} ao desligar IA`)
  }
  return response.json()
}
