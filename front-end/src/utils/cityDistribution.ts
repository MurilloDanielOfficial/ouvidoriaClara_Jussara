import type { OcorrenciaPorCidade } from '../types'

/* Rótulo exibido para solicitações sem cidade identificada. O backend manda
   vários placeholders ('N/A', 'Sem cidade', vazio…) — todos viram isso. */
export const ROTULO_SEM_CIDADE = 'Não informado'

const VAZIOS = new Set([
  '', '-', '--', 'n/a', 'na', 'n.a', 'null', 'undefined',
  'sem cidade', 'nao informado',
])

/* Rótulos canônicos para chaves já normalizadas — cobre abreviações e
   variantes sem acento que o backend emite soltas ('SP', 'Sao Paulo'…). */
const ALIAS_LABEL: Record<string, string> = {
  'sao paulo': 'São Paulo',
}

const normKey = (raw: string): string =>
  raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()

/* Chave canônica de cidade: acentos, caixa, pontos e espaços não diferenciam;
   abreviações conhecidas ('sp', 's paulo') colapsam na cidade completa. */
export function chaveCidade(nome: string | null | undefined): string {
  const k = normKey(String(nome ?? ''))
  if (VAZIOS.has(k)) return '__sem_cidade__'
  // UF colada no nome ('Poá-SP', 'Limeira - SP', 'Angatuba SP') não muda a cidade
  const semUf = k.replace(/[\s-]+sp$/, '')
  const base = semUf || k
  // 'São Paulo Capital' e abreviações 'SP'/'S. Paulo' → a própria São Paulo
  if (base === 'sp' || base === 's paulo' || base === 'sao paulo capital') return 'sao paulo'
  return base
}

/* Melhor variante de exibição para uma chave: a que soma mais registros;
   empate → prefere a com acentuação própria ('São Paulo' > 'Sao Paulo'). */
function melhorVariante(variants: Map<string, number>): string {
  let best = ''
  let bestTotal = -1
  for (const [label, total] of variants) {
    if (
      total > bestTotal ||
      (total === bestTotal && /[^\x20-\x7E]/.test(label) && !/[^\x20-\x7E]/.test(best))
    ) {
      best = label
      bestTotal = total
    }
  }
  return best
}

export function normalizeCidades(data: OcorrenciaPorCidade[] | null | undefined): OcorrenciaPorCidade[] {
  const map = new Map<string, OcorrenciaPorCidade & { variants: Map<string, number> }>()
  for (const c of data ?? []) {
    // mesmo strip de UF no rótulo — 'Poá-SP' exibe 'Poá' quando é a única variante
    const nome = (c.cidade || '').trim().replace(/[\s-]+sp$/i, '').trim()
    const key = chaveCidade(c.cidade)
    const total = c.total || 0
    const prev = map.get(key)
    if (!prev) {
      map.set(key, {
        cidade: nome,
        categoria: { ...(c.categoria || {}) },
        total,
        variants: new Map([[nome, total]]),
      })
    } else {
      for (const [cat, n] of Object.entries(c.categoria || {})) {
        prev.categoria[cat] = (prev.categoria[cat] || 0) + n
      }
      prev.total += total
      prev.variants.set(nome, (prev.variants.get(nome) || 0) + total)
    }
  }
  const out: OcorrenciaPorCidade[] = []
  for (const [key, row] of map) {
    const { variants, ...rest } = row
    rest.cidade = key === '__sem_cidade__'
      ? ROTULO_SEM_CIDADE
      : ALIAS_LABEL[key] ?? melhorVariante(variants)
    out.push(rest)
  }
  return out.sort((a, b) => b.total - a.total)
}
