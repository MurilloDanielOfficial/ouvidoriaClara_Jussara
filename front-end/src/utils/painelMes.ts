import type { ContatoUnificado, ConversaResumo, Ocorrencia } from '../types'
import { formatCategoryName } from './categories'

/* Helpers puros do painel do mês (/dashboard). Toda a lógica de datas trabalha
   em "dias civis" — meia-noite UTC — para não ter drift de fuso nem de DST.
   Baseado no painel da Ângela (visao-geral.js), adaptado: contatos que entraram
   = dataCriacao do contato unificado; atendidos = telefones com conversa no
   período; sem tratativa = solicitações com status 'criado'. */

export type ModoPeriodo = 'mes' | 'dias' | 'custom' | 'total'

export interface Janela {
  inicio: Date // meia-noite UTC do primeiro dia
  fim: Date // meia-noite UTC do último dia (inclusivo)
}

export interface Janelas {
  atual: Janela
  anterior: Janela | null // null no modo "total" — não há comparação
}

export interface PeriodoCustom {
  inicio: string // 'YYYY-MM-DD'
  fim: string // 'YYYY-MM-DD'
}

const UM_DIA = 24 * 60 * 60 * 1000

/* Extrai o dia civil de uma string de data ('YYYY-MM-DD', 'YYYY-MM-DD HH:MM:SS'
   ou ISO) como meia-noite UTC — usa o dia gravado, sem conversão de fuso. */
export function diaUTC(valor: string | null | undefined): Date | null {
  if (!valor) return null
  const m = valor.trim().match(/(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
}

/* "Hoje" como dia civil local ancorado em UTC. */
export function hojeUTC(hoje: Date = new Date()): Date {
  return new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()))
}

/* Monta as janelas atual/anterior do modo selecionado.
   - 'mes': dia 1 do mês corrente → hoje; anterior = mesmo intervalo de dias no
     mês passado (truncado no último dia do mês anterior).
   - 'dias': hoje - (N-1) → hoje; anterior = os N dias imediatamente anteriores.
   - 'custom': [inicio, fim] dados; anterior = mesma duração terminando no dia
     anterior ao início. Retorna null se o intervalo for inválido.
   - 'total': epoch → hoje, sem período anterior. */
export function montarJanelas(
  modo: ModoPeriodo,
  periodoDias = 30,
  periodoCustom?: PeriodoCustom | null,
  hoje: Date = new Date(),
): Janelas | null {
  const fimAtual = hojeUTC(hoje)

  if (modo === 'mes') {
    const iniMes = new Date(Date.UTC(fimAtual.getUTCFullYear(), fimAtual.getUTCMonth(), 1))
    const diaHoje = fimAtual.getUTCDate()
    const iniAnt = new Date(Date.UTC(fimAtual.getUTCFullYear(), fimAtual.getUTCMonth() - 1, 1))
    const ultimoDiaAnt = new Date(Date.UTC(fimAtual.getUTCFullYear(), fimAtual.getUTCMonth(), 0)).getUTCDate()
    return {
      atual: { inicio: iniMes, fim: fimAtual },
      anterior: {
        inicio: iniAnt,
        fim: new Date(Date.UTC(iniAnt.getUTCFullYear(), iniAnt.getUTCMonth(), Math.min(diaHoje, ultimoDiaAnt))),
      },
    }
  }

  if (modo === 'custom') {
    const inicio = diaUTC(periodoCustom?.inicio)
    const fim = diaUTC(periodoCustom?.fim)
    if (!inicio || !fim || inicio > fim) return null
    const durDias = Math.round((fim.getTime() - inicio.getTime()) / UM_DIA) + 1
    return {
      atual: { inicio, fim },
      anterior: {
        inicio: new Date(inicio.getTime() - durDias * UM_DIA),
        fim: new Date(inicio.getTime() - UM_DIA),
      },
    }
  }

  if (modo === 'total' || !periodoDias) {
    return { atual: { inicio: new Date(0), fim: fimAtual }, anterior: null }
  }

  const iniAtual = new Date(fimAtual.getTime() - (periodoDias - 1) * UM_DIA)
  const fimAnterior = new Date(iniAtual.getTime() - UM_DIA)
  return {
    atual: { inicio: iniAtual, fim: fimAtual },
    anterior: { inicio: new Date(fimAnterior.getTime() - (periodoDias - 1) * UM_DIA), fim: fimAnterior },
  }
}

function dentroDoPeriodo(dia: Date | null, janela: Janela): boolean {
  return dia != null && dia >= janela.inicio && dia <= janela.fim
}

/* Telefones únicos com conversa no período (criadoEm = última mensagem, mesmo
   campo usado no ListConversas e no card "Pessoas Atendidas"). */
export function telefonesAtendidos(conversas: ConversaResumo[], janela: Janela): Set<string> {
  const set = new Set<string>()
  for (const c of conversas) {
    if (!c.telefone) continue
    if (!dentroDoPeriodo(diaUTC(c.criadoEm), janela)) continue
    set.add(c.telefone)
  }
  return set
}

/* Telefones de contatos cadastrados no período (dataCriacao do contato
   unificado). Contatos sem dataCriacao não entram na contagem. */
export function contatosEntraram(contatos: ContatoUnificado[], janela: Janela): Set<string> {
  const set = new Set<string>()
  for (const c of contatos) {
    if (!c.telefone || !c.dataCriacao) continue
    if (!dentroDoPeriodo(diaUTC(c.dataCriacao), janela)) continue
    set.add(c.telefone)
  }
  return set
}

export function ocorrenciasNoPeriodo(ocorrencias: Ocorrencia[], janela: Janela): Ocorrencia[] {
  return ocorrencias.filter((o) => dentroDoPeriodo(diaUTC(o.dataCriacao), janela))
}

/* "Sem tratativa" = solicitação criada no período ainda com status 'criado'. */
export function semTratativa(ocorrencias: Ocorrencia[], janela: Janela): number {
  return ocorrenciasNoPeriodo(ocorrencias, janela).filter(
    (o) => (o.status || '').toLowerCase() === 'criado',
  ).length
}

/* Telefones únicos que abriram solicitação no período. */
export function solicitantesNoPeriodo(ocorrencias: Ocorrencia[], janela: Janela): Set<string> {
  const set = new Set<string>()
  for (const o of ocorrenciasNoPeriodo(ocorrencias, janela)) {
    if (o.telefone) set.add(o.telefone)
  }
  return set
}

/* Taxa de abertura = atendidos que abriram solicitação ÷ atendidos.
   Retorna null quando não há atendidos (evita divisão por zero). */
export function taxaAbertura(atendidos: Set<string>, solicitantes: Set<string>): number | null {
  if (atendidos.size === 0) return null
  let comSolicitacao = 0
  atendidos.forEach((tel) => {
    if (solicitantes.has(tel)) comSolicitacao += 1
  })
  return (comSolicitacao / atendidos.size) * 100
}

/* Novos vs reincidentes: classifica os atendidos do período — "novo" se o
   telefone entrou no CRM dentro da janela (data_criacao do contato é a melhor
   aproximação de "primeira conversa": ConversaResumo só traz o criadoEm da
   ÚLTIMA mensagem, então não diz quando a pessoa falou pela primeira vez).
   Atendido sem contato com data → conta como novo (única evidência é a
   conversa vista na janela). */
export function novosVsReincidentes(
  conversas: ConversaResumo[],
  contatos: ContatoUnificado[],
  janela: Janela,
): { novos: number; reincidentes: number } {
  const entradaPorTel = new Map<string, Date>()
  for (const c of contatos) {
    if (!c.telefone) continue
    const d = diaUTC(c.dataCriacao)
    if (!d) continue
    const prev = entradaPorTel.get(c.telefone)
    if (!prev || d < prev) entradaPorTel.set(c.telefone, d)
  }
  let novos = 0
  let reincidentes = 0
  telefonesAtendidos(conversas, janela).forEach((tel) => {
    const entrada = entradaPorTel.get(tel)
    if (!entrada || entrada >= janela.inicio) novos += 1
    else reincidentes += 1
  })
  return { novos, reincidentes }
}

/* Rótulo do período de comparação usado nas linhas de referência dos deltas. */
export function rotuloAnterior(modo: ModoPeriodo, periodoDias = 30): string | null {
  if (modo === 'mes') return 'no mesmo período do mês anterior'
  if (modo === 'custom') return 'no período anterior'
  if (modo === 'total') return null
  return `nos ${periodoDias} dias anteriores`
}

/* Resumo de um período para o hero, sinais e "onde focar": contagem por
   status + quebra por categoria em um único passo. */
export interface ResumoPeriodo {
  total: number
  semTratativa: number // status 'criado'
  emAnalise: number
  concluidas: number // aprovado + finalizado
  desqualificadas: number // reprovado
  manuais: number // eh_manual — registradas pela equipe, fora do fluxo da Ju
  porCategoria: Map<string, number>
}

export function resumoPeriodo(ocorrencias: Ocorrencia[], janela: Janela): ResumoPeriodo {
  const r: ResumoPeriodo = {
    total: 0,
    semTratativa: 0,
    emAnalise: 0,
    concluidas: 0,
    desqualificadas: 0,
    manuais: 0,
    porCategoria: new Map(),
  }
  for (const o of ocorrenciasNoPeriodo(ocorrencias, janela)) {
    r.total += 1
    if (o.ehManual) r.manuais += 1
    const st = (o.status || '').toLowerCase()
    if (st === 'criado') r.semTratativa += 1
    else if (st === 'em análise' || st === 'em analise') r.emAnalise += 1
    else if (st === 'aprovado' || st === 'finalizado') r.concluidas += 1
    else if (st === 'reprovado') r.desqualificadas += 1
    const rawCat = (o.categoria || '').trim()
    const cat = rawCat ? formatCategoryName(rawCat) : 'Sem categoria'
    r.porCategoria.set(cat, (r.porCategoria.get(cat) || 0) + 1)
  }
  return r
}

/* Zona de saúde do período — adaptação da zonaNPS da Ângela. Em vez de NPS,
   mede a % de solicitações já tratadas (fora do status 'criado'): quanto
   menor a fila parada, melhor a leitura. Quatro faixas, mesmas cores. */
export interface Zona {
  nome: string
  classe: 'excelencia' | 'qualidade' | 'atencao' | 'critica'
}

export function zonaTratamento(r: ResumoPeriodo): Zona | null {
  if (r.total === 0) return null
  const pctTratada = ((r.total - r.semTratativa) / r.total) * 100
  if (pctTratada >= 90) return { nome: 'Excelente', classe: 'excelencia' }
  if (pctTratada >= 70) return { nome: 'Boa', classe: 'qualidade' }
  if (pctTratada >= 40) return { nome: 'Atenção', classe: 'atencao' }
  return { nome: 'Crítica', classe: 'critica' }
}

/* Série dos últimos 12 meses (independe do chip de período — é sempre a
   tendência histórica): barras = solicitações por mês, linha = pessoas
   atendidas por mês. criadoEm é a ÚLTIMA mensagem da conversa — um telefone
   que falou em meses diferentes entra só no mês da última atividade. */
export interface MesPonto {
  chave: string // 'YYYY-MM'
  label: string // 'out/26'
  labelLongo: string // 'outubro de 2026'
  solicitacoes: number
  atendidos: number
}

export function serie12Meses(
  ocorrencias: Ocorrencia[],
  conversas: ConversaResumo[],
  hoje: Date = new Date(),
): MesPonto[] {
  const ref = hojeUTC(hoje)
  const meses: MesPonto[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - i, 1))
    meses.push({
      chave: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
      label: `${d.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace(/\./g, '')}/${String(d.getUTCFullYear()).slice(2)}`,
      labelLongo: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      solicitacoes: 0,
      atendidos: 0,
    })
  }
  const mapa = new Map(meses.map((m) => [m.chave, m]))
  for (const o of ocorrencias) {
    const d = diaUTC(o.dataCriacao)
    if (!d) continue
    const m = mapa.get(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
    if (m) m.solicitacoes += 1
  }
  for (const c of conversas) {
    const d = diaUTC(c.criadoEm)
    if (!d) continue
    const m = mapa.get(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
    if (m) m.atendidos += 1
  }
  return meses
}

/* Sinais do período: relatos de atenção / observação / positivo comparando
   janela atual × anterior (mesma regra da Ângela — negativos nunca omitidos,
   positivos exibidos quando reais). Sem anterior (modo total) só entram os
   sinais absolutos. */
export interface Sinal {
  texto: string
  /* Ação sugerida — transforma o relato em orientação ("o que fazer agora"),
     como a Ângela faz com os callouts clicáveis. */
  acao?: { para: string; label: string }
}

export interface Sinais {
  atencao: Sinal[]
  observacao: Sinal[]
  positivo: Sinal[]
}

export function calcularSinais(
  atual: ResumoPeriodo,
  anterior: ResumoPeriodo | null,
  ultimaConversa: Date | null,
  hoje: Date = new Date(),
  cidades?: { atual: Map<string, number>; anterior: Map<string, number> | null },
): Sinais {
  const sinais: Sinais = { atencao: [], observacao: [], positivo: [] }

  // fila parada total: nenhuma solicitação do período foi tratada — o alerta
  // mais forte possível, independente de comparação
  if (atual.total > 0 && atual.semTratativa === atual.total) {
    sinais.atencao.push({
      texto: `Nenhuma das ${atual.total} ${atual.total === 1 ? 'solicitação foi tratada' : 'solicitações foi tratada'} neste período — a fila está parada.`,
      acao: { para: '/solicitacoes', label: 'tratar agora' },
    })
  } else if (atual.semTratativa > 0) {
    /* Sinal ÚNICO de pendências: quando há período anterior, a comparação vai
       embutida no texto em vez de gerar um segundo sinal repetindo o número
       ("1 aguarda tratativa" + "mais sem tratativa: 1 vs 0" era redundante). */
    const temComp = anterior != null && anterior.total > 0
    const texto = temComp && atual.semTratativa > anterior!.semTratativa
      ? `Mais solicitações sem tratativa: ${atual.semTratativa} neste período (${anterior!.semTratativa} no anterior).`
      : temComp && atual.semTratativa < anterior!.semTratativa
        ? `${atual.semTratativa} ${atual.semTratativa === 1 ? 'solicitação aguarda' : 'solicitações aguardam'} tratativa — menos que no período anterior (${anterior!.semTratativa}).`
        : `${atual.semTratativa} ${atual.semTratativa === 1 ? 'solicitação aguarda' : 'solicitações aguardam'} tratativa no período.`
    sinais.atencao.push({
      texto,
      acao: { para: '/solicitacoes', label: 'tratar agora' },
    })
  }

  if (anterior && atual.total > 0 && anterior.total > 0) {
    if (atual.concluidas > anterior.concluidas) {
      sinais.positivo.push({
        texto: `Mais solicitações tratadas: ${atual.concluidas} ${atual.concluidas === 1 ? 'concluída' : 'concluídas'} neste período (${anterior.concluidas} no anterior).`,
      })
    }
    if (atual.total > anterior.total) {
      sinais.observacao.push({
        texto: `Volume de solicitações cresceu: ${atual.total} neste período (${anterior.total} no anterior) — mais demanda chegando.`,
      })
    }

    // categoria com maior alta e maior queda
    let maiorAlta: { cat: string; delta: number } | null = null
    let maiorQueda: { cat: string; delta: number } | null = null
    const cats = new Set([...atual.porCategoria.keys(), ...anterior.porCategoria.keys()])
    for (const cat of cats) {
      const d = (atual.porCategoria.get(cat) || 0) - (anterior.porCategoria.get(cat) || 0)
      if (d > 0 && (!maiorAlta || d > maiorAlta.delta)) maiorAlta = { cat, delta: d }
      if (d < 0 && (!maiorQueda || d < maiorQueda.delta)) maiorQueda = { cat, delta: d }
    }
    if (maiorAlta) {
      const antes = anterior.porCategoria.get(maiorAlta.cat) || 0
      sinais.observacao.push({
        texto: `"${maiorAlta.cat}" foi a solicitação que mais cresceu: ${atual.porCategoria.get(maiorAlta.cat)} neste período (${antes} no anterior).`,
      })
    }
    if (maiorQueda) {
      const antes = anterior.porCategoria.get(maiorQueda.cat) || 0
      sinais.positivo.push({
        texto: `"${maiorQueda.cat}" foi a que mais diminuiu: ${atual.porCategoria.get(maiorQueda.cat) || 0} neste período (${antes} no anterior).`,
      })
    }

    // cidades: maior alta/queda de solicitações (equivale aos sinais de
    // unidade da Ângela; delta ≥2 filtra ruído de amostras minúsculas)
    if (cidades?.anterior) {
      let altaR: { cid: string; delta: number; atual: number } | null = null
      let quedaR: { cid: string; delta: number; atual: number } | null = null
      for (const cid of new Set([...cidades.atual.keys(), ...cidades.anterior.keys()])) {
        const d = (cidades.atual.get(cid) || 0) - (cidades.anterior.get(cid) || 0)
        if (d >= 2 && (!altaR || d > altaR.delta)) altaR = { cid, delta: d, atual: cidades.atual.get(cid) || 0 }
        if (d <= -2 && (!quedaR || d < quedaR.delta)) quedaR = { cid, delta: d, atual: cidades.atual.get(cid) || 0 }
      }
      if (altaR) {
        sinais.observacao.push({
          texto: `Cidade "${altaR.cid}" foi a que mais cresceu em solicitações: ${altaR.atual} neste período (${cidades.anterior.get(altaR.cid) || 0} no anterior).`,
        })
      }
      if (quedaR) {
        sinais.positivo.push({
          texto: `Cidade "${quedaR.cid}" foi a que mais diminuiu em solicitações: ${quedaR.atual} neste período (${cidades.anterior.get(quedaR.cid) || 0} no anterior).`,
        })
      }
    }
  }

  if (atual.total > 0 && atual.semTratativa === 0) {
    sinais.positivo.push({ texto: 'Nenhuma solicitação sem tratativa no período.' })
  }

  // específico da Jussara (sem equivalente na Ângela): solicitações criadas
  // pela equipe entraram fora do funil da Ju — contexto de origem da demanda
  if (atual.manuais > 0) {
    sinais.observacao.push({
      texto: `${atual.manuais} ${atual.manuais === 1 ? 'solicitação foi registrada' : 'solicitações foram registradas'} manualmente pela equipe neste período — ${atual.manuais === 1 ? 'entrou' : 'entraram'} fora do fluxo da Ju.`,
    })
  }

  // dados parados: última conversa há mais de 7 dias
  if (ultimaConversa) {
    const diasParado = Math.floor((hojeUTC(hoje).getTime() - ultimaConversa.getTime()) / UM_DIA)
    if (diasParado > 7) {
      sinais.observacao.push({
        texto: `Nenhuma conversa nova com a Ju há ${diasParado} dias (última em ${ultimaConversa.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })}).`,
        acao: { para: '/conversas', label: 'ver conversas' },
      })
    }
  }

  return sinais
}

export interface DeltaInfo {
  texto: string // ex.: '▲ 3 a mais' | '▼ 2 a menos' | '＝ mesmo nível'
  direcao: 'up' | 'down' | 'flat'
}

/* Delta vs período anterior com formatação pt-BR (vírgula decimal) e o
   wording da referência: '▲ N a mais' / '▼ N a menos' / '＝ mesmo nível'.
   Retorna null quando não há período anterior (modo total). */
export function formatarDelta(atual: number, anterior: number | null | undefined, sufixo = ''): DeltaInfo | null {
  if (anterior == null || !Number.isFinite(anterior)) return null
  const delta = atual - anterior
  if (delta === 0) return { texto: '＝ mesmo nível', direcao: 'flat' }
  const abs = Math.abs(delta)
  const valor = Number.isInteger(abs) ? String(abs) : abs.toFixed(1).replace('.', ',')
  const uni = sufixo ? `${sufixo} ` : ''
  return {
    texto: `${delta > 0 ? '▲' : '▼'} ${valor} ${uni}${delta > 0 ? 'a mais' : 'a menos'}`,
    direcao: delta > 0 ? 'up' : 'down',
  }
}
