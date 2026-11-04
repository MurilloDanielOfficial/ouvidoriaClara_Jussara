import { jsPDF } from 'jspdf'
import { formatCategoryName } from './categories'
import { toUTCDate } from './date'
import type { Ocorrencia, ContatoUnificado, ConversaResumo } from '../types'

// ---- Paleta Ouvidoria Jussara ----
const NAVY: [number, number, number] = [35, 46, 72]        // hsl(222 35% 21%)
const NAVY_DEEP: [number, number, number] = [27, 36, 58]
const ORANGE: [number, number, number] = [240, 101, 23]    // #f06517
const RED: [number, number, number] = [220, 38, 38]        // #DC2626
const GREEN: [number, number, number] = [102, 187, 128]    // #66BB80
const BLUE: [number, number, number] = [98, 161, 216]      // #62A1D8
const STEEL: [number, number, number] = [65, 102, 156]     // #41669C
const ORANGE_SOFT: [number, number, number] = [232, 158, 112] // #E89E70
const PURPLE: [number, number, number] = [185, 140, 232]   // #B98CE8
const BLUE_OUTROS: [number, number, number] = [91, 143, 224] // #5B8FE0
const GRAY: [number, number, number] = [161, 169, 184]     // #A1A9B8
const BG: [number, number, number] = [244, 245, 250]
const TRACK: [number, number, number] = [236, 238, 246]
const TXT: [number, number, number] = [35, 46, 72]
const TXT_MUTED: [number, number, number] = [105, 110, 130]
const TXT_FAINT: [number, number, number] = [140, 145, 165]
const WHITE: [number, number, number] = [255, 255, 255]

const LOCAL_DDD = '15' // Sorocaba/SP
const FONTE = 'Fonte: CRM da Ouvidoria Jussara · telas de Solicitações, Contatos e Estatísticas'

type RGB = [number, number, number]

export interface RelatorioLinha {
  label: string
  value: number
  pct: number
  color: RGB
}

export type NivelAlerta = 'CRÍTICO' | 'ATENÇÃO' | 'OBSERVAÇÃO' | 'EM DIA'

export interface RelatorioAlerta {
  nivel: NivelAlerta
  numero: string
  titulo: string
  descricao: string
}

export interface RelatorioPasso {
  numero: string
  titulo: string
  descricao: string
}

export interface RelatorioData {
  geradoEmDia: string
  geradoEmAno: string
  periodoLabel: string
  totalSolicitacoes: number
  semTratativa: number
  emAnalise: number
  resolvidas: number
  tratadas: number
  pctParadas: number
  taxaResolucao: number
  pessoasAtendidas: number
  pctViraramSolicitacao: number
  contatosCRM: number
  funil: { atendidos: number; abriram: number; aguardando: number; resolvidas: number }
  statusRows: RelatorioLinha[]
  categoriaRows: RelatorioLinha[]
  regiaoRows: { label: string; value: number }[]
  cidadeRows: { label: string; value: number }[]
  statusFootnote: string | null
  categoriaFootnote: string | null
  alertas: RelatorioAlerta[]
  passos: RelatorioPasso[]
  bannerRodape: string | null
}

const pct = (part: number, total: number): number => (total > 0 ? Math.round((part / total) * 100) : 0)

const extractDDD = (telefone: string): string | null => {
  let d = String(telefone || '').replace(/\D/g, '')
  if (d.startsWith('55') && d.length > 11) d = d.slice(2)
  return d.length >= 10 ? d.slice(0, 2) : null
}

const fmtData = (d: Date): string =>
  d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })

const fmtDiaMes = (d: Date): string =>
  d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })

// Pessoas atendidas pela Ju = total de conversas (quem falou com a IA).
// A tabela contatos inclui cadastros que nunca interagiram — ex.: Lideranças
// registradas sem passar pela Ju — então só o chat conta aqui. Inativados
// continuam contando: foram atendidos pela IA antes de serem inativados.
// Filtra pelo criadoEm da última mensagem (mesmo critério do ListConversas).
// Filtra por dia civil impresso no timestamp ('YYYY-MM-DD'), a mesma regra do
// diaUTC no painel — evita divergir quando a data vem como 'Z', offset ou naive.
function diaDe(s?: string | null): string | null {
  return s?.trim().match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null
}

function dentroDaJanela(dia: string | null, inicio?: string, fim?: string): boolean {
  if (!dia) return false
  if (inicio && dia < inicio) return false
  if (fim && dia > fim) return false
  return true
}

export function computeChatPhones(
  conversas: ConversaResumo[],
  inicio?: string,
  fim?: string,
): Set<string> {
  const phones = new Set<string>()
  for (const c of conversas) {
    if (!c.telefone) continue
    if ((inicio || fim) && !dentroDaJanela(diaDe(c.criadoEm), inicio, fim)) continue
    phones.add(c.telefone)
  }
  return phones
}

export function computeRelatorioData(
  ocorrencias: Ocorrencia[],
  contatos: ContatoUnificado[],
  conversas: ConversaResumo[],
  inicio?: string,
  fim?: string,
  now: Date = new Date(),
  cidadesAtual?: Map<string, number>,
): RelatorioData {
  const total = ocorrencias.length

  let semTratativa = 0
  let emAnalise = 0
  let finalizado = 0
  let desqualificado = 0
  let outrosStatus = 0
  const aprovPorTipo: Record<string, number> = { requerimento: 0, indicacao: 0, 'causa animal': 0, outros: 0 }

  const catMap: Record<string, number> = {}
  const regMap: Record<string, number> = {}
  let causaAnimal = 0
  const telefones = new Set<string>()
  let minData: Date | null = null
  let maxData: Date | null = null

  for (const o of ocorrencias) {
    const st = (o.status || '').toLowerCase()
    const tp = (o.tipo || '').toLowerCase()
    if (st === 'criado') semTratativa++
    else if (st === 'em análise' || st === 'em analise') emAnalise++
    else if (st === 'aprovado' && tp in aprovPorTipo) aprovPorTipo[tp]++
    else if (st === 'finalizado') finalizado++
    else if (st === 'reprovado') desqualificado++
    else outrosStatus++

    const cat = formatCategoryName(o.categoria || 'Sem Categoria')
    catMap[cat] = (catMap[cat] || 0) + 1

    // Mesma regra do painel: sem região no detalhe → "Outros"
    const reg = (o.detalhes?.regiao || '').trim() || 'Outros'
    regMap[reg] = (regMap[reg] || 0) + 1
    if (tp === 'causa animal') causaAnimal++

    if (o.telefone) telefones.add(o.telefone)

    const d = toUTCDate(o.dataCriacao)
    if (!isNaN(d.getTime())) {
      if (!minData || d < minData) minData = d
      if (!maxData || d > maxData) maxData = d
    }
  }

  const resolvidas =
    aprovPorTipo.requerimento + aprovPorTipo.indicacao + aprovPorTipo['causa animal'] + aprovPorTipo.outros + finalizado
  const tratadas = total - semTratativa
  const pctParadas = pct(semTratativa, total)
  const taxaResolucao = pct(resolvidas, total)

  const chatPhones = computeChatPhones(conversas, inicio, fim)
  const pessoasAtendidas = chatPhones.size
  const viraram = [...telefones].filter((t) => chatPhones.has(t)).length
  const pctViraram = pessoasAtendidas > 0 ? Math.min(100, pct(viraram, pessoasAtendidas)) : 0

  // Contatos respeitam o mesmo recorte: cadastrados dentro do período.
  // Sem filtro de data → todos.
  const contatosFiltrados = (inicio || fim)
    ? contatos.filter((c) => dentroDaJanela(diaDe(c.dataCriacao), inicio, fim))
    : contatos

  const statusRows: RelatorioLinha[] = [
    { label: 'Sem tratativa', value: semTratativa, pct: pct(semTratativa, total), color: RED },
    { label: 'Em análise', value: emAnalise, pct: pct(emAnalise, total), color: BLUE },
    { label: 'Concluído como requerimento', value: aprovPorTipo.requerimento, pct: pct(aprovPorTipo.requerimento, total), color: ORANGE_SOFT },
    { label: 'Concluído como indicação', value: aprovPorTipo.indicacao, pct: pct(aprovPorTipo.indicacao, total), color: GREEN },
    { label: 'Concluído como causa animal', value: aprovPorTipo['causa animal'], pct: pct(aprovPorTipo['causa animal'], total), color: PURPLE },
    { label: 'Concluído (outros)', value: aprovPorTipo.outros, pct: pct(aprovPorTipo.outros, total), color: BLUE_OUTROS },
    { label: 'Desqualificado', value: desqualificado, pct: pct(desqualificado, total), color: GRAY },
  ]
  if (outrosStatus > 0) {
    statusRows.push({ label: 'Outros status', value: outrosStatus, pct: pct(outrosStatus, total), color: TXT_FAINT })
  }

  const catSorted = Object.entries(catMap).sort((a, b) => b[1] - a[1])
  const CAT_COLORS: RGB[] = [STEEL, ORANGE_SOFT, GREEN, BLUE, PURPLE, RED, ORANGE, GRAY]
  const topCats = catSorted.slice(0, 7)
  const demais = catSorted.slice(7).reduce((s, [, v]) => s + v, 0)
  const categoriaRows: RelatorioLinha[] = topCats.map(([label, value], i) => ({
    label, value, pct: pct(value, total), color: CAT_COLORS[i % CAT_COLORS.length],
  }))
  if (demais > 0) {
    categoriaRows.push({ label: 'Demais categorias', value: demais, pct: pct(demais, total), color: GRAY })
  }

  // Geografia: região vem dos detalhes da própria ocorrência (mesma fonte da
  // seção "Solicitações por região" do painel); cidade vem do mapa já
  // agregado que a página carrega de /ocorrencias/cidades.
  const regiaoRows = Object.entries(regMap)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 7)
    .map(([label, value]) => ({ label, value }))
  const cidadeRows = [...(cidadesAtual?.entries() ?? [])]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 7)
    .map(([label, value]) => ({ label, value }))

  const excluirLideres = new Set(['Outros', 'Demais categorias', 'Sem Categoria', 'Geral'])
  const lideres = topCats.map(([l]) => l).filter((l) => !excluirLideres.has(l)).slice(0, 2)
  const categoriaFootnote =
    lideres.length === 2 ? `${lideres[0]} e ${lideres[1]} lideram entre as categorias.`
    : lideres.length === 1 ? `${lideres[0]} lidera entre as categorias.`
    : null

  const statusFootnote =
    total === 0 ? null
    : semTratativa > 0 ? 'A maior parte segue aguardando triagem.'
    : resolvidas > 0 ? `${resolvidas} solicitações concluídas.` : null

  // DDDs fora de Sorocaba (15)
  const dddMap: Record<string, number> = {}
  for (const c of contatosFiltrados) {
    const ddd = extractDDD(c.telefone)
    if (ddd && ddd !== LOCAL_DDD) dddMap[ddd] = (dddMap[ddd] || 0) + 1
  }
  const dddsFora = Object.entries(dddMap).sort((a, b) => b[1] - a[1])

  const alertas: RelatorioAlerta[] = []
  if (semTratativa > 0) {
    alertas.push({
      nivel: 'CRÍTICO',
      numero: String(semTratativa),
      titulo: 'solicitações sem tratativa',
      descricao: emAnalise === 0
        ? 'Coluna "Em análise" zerada: a triagem ainda não começou.'
        : `${emAnalise} já em análise; acelerar a triagem das demais.`,
    })
  }
  if (total > 0) {
    alertas.push({
      nivel: taxaResolucao === 0 ? 'CRÍTICO' : taxaResolucao < 50 ? 'ATENÇÃO' : 'EM DIA',
      numero: `${taxaResolucao}%`,
      titulo: 'taxa real de resolução',
      descricao: taxaResolucao === 0
        ? 'Nenhuma solicitação concluída até agora.'
        : `${resolvidas} de ${total} solicitações concluídas.`,
    })
  }
  // Causa animal é a pauta dominante do gabinete (~3/4 do volume real):
  // merece visibilidade própria, não só a linha de status no card.
  if (causaAnimal > 0) {
    alertas.push({
      nivel: 'OBSERVAÇÃO',
      numero: `${pct(causaAnimal, total)}%`,
      titulo: 'das solicitações é causa animal',
      descricao: `${causaAnimal} de ${total} solicitações do recorte são denúncias de causa animal.`,
    })
  }
  if (dddsFora.length > 0) {
    const totalFora = dddsFora.reduce((s, [, n]) => s + n, 0)
    const detalhe = dddsFora.slice(0, 3)
      .map(([d, n]) => `${d} (×${n.toLocaleString('pt-BR')})`)
      .join(', ')
    alertas.push({
      nivel: 'OBSERVAÇÃO',
      numero: String(dddsFora.length),
      titulo: 'DDDs diferentes fora de Sorocaba',
      descricao: `DDD local é ${LOCAL_DDD}. Total de ${totalFora.toLocaleString('pt-BR')} contatos fora. Principais: ${detalhe}.`,
    })
  }
  if (alertas.length === 0) {
    alertas.push(
      total === 0
        ? { nivel: 'OBSERVAÇÃO', numero: '0', titulo: 'solicitações no período', descricao: 'Nenhum registro para o recorte selecionado.' }
        : { nivel: 'EM DIA', numero: '0', titulo: 'pendências de triagem', descricao: 'Todas as solicitações já têm tratativa.' },
    )
  }

  const passos: RelatorioPasso[] = []
  if (semTratativa > 0) {
    passos.push({
      numero: '01',
      titulo: `Triar as ${semTratativa} pendentes`,
      descricao: lideres.length > 0
        ? `Designar responsáveis, começando por ${lideres.join(' e ')}.`
        : 'Designar responsáveis para cada solicitação.',
    })
    passos.push({
      numero: '02',
      titulo: 'Responder em até 48h',
      descricao: 'Enviar ao cidadão: "recebemos e estamos analisando".',
    })
  } else if (emAnalise > 0) {
    passos.push({
      numero: '01',
      titulo: `Concluir as ${emAnalise} em análise`,
      descricao: 'Fechar a triagem e registrar o desfecho de cada uma.',
    })
    passos.push({
      numero: '02',
      titulo: 'Comunicar o cidadão',
      descricao: 'Retornar com o resultado de cada solicitação.',
    })
  } else if (total > 0) {
    passos.push({
      numero: '01',
      titulo: 'Comunicar as resoluções',
      descricao: `Retornar ao cidadão o desfecho das ${resolvidas} solicitações concluídas.`,
    })
    passos.push({ numero: '02', titulo: 'Monitorar novos registros', descricao: 'Revisar a fila de solicitações diariamente.' })
  } else {
    passos.push({ numero: '01', titulo: 'Divulgar o canal', descricao: 'Incentivar o registro de demandas pela assistente Ju.' })
    passos.push({ numero: '02', titulo: 'Monitorar novos registros', descricao: 'Revisar a fila de solicitações diariamente.' })
  }

  const bannerRodape = (() => {
    if (!minData || !maxData) return null
    const mesmoDia = fmtData(minData) === fmtData(maxData)
    if (semTratativa > 0) {
      return mesmoDia
        ? `Os registros são de ${fmtDiaMes(minData)}: é a hora de agir, antes que as pendências envelheçam.`
        : `Os registros vão de ${fmtDiaMes(minData)} a ${fmtDiaMes(maxData)}: agir antes que as pendências envelheçam.`
    }
    return `Registros de ${fmtDiaMes(minData)}${mesmoDia ? '' : ` a ${fmtDiaMes(maxData)}`} no recorte atual.`
  })()

  const periodoLabel = inicio && fim
    ? `Período: ${fmtData(toUTCDate(inicio))} – ${fmtData(toUTCDate(fim))}`
    : inicio ? `Período: a partir de ${fmtData(toUTCDate(inicio))}`
    : fim ? `Período: até ${fmtData(toUTCDate(fim))}`
    : 'Período: todo o histórico'

  return {
    geradoEmDia: now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    geradoEmAno: String(now.getFullYear()),
    periodoLabel,
    totalSolicitacoes: total,
    semTratativa,
    emAnalise,
    resolvidas,
    tratadas,
    pctParadas,
    taxaResolucao,
    pessoasAtendidas,
    pctViraramSolicitacao: pctViraram,
    // Mesma base da aba Contatos: só ativos — inativados (ativo=false,
    // soft-delete) não aparecem na aba e não entram aqui.
    contatosCRM: contatosFiltrados.filter((c) => c.leadAtivo).length,
    funil: { atendidos: pessoasAtendidas, abriram: total, aguardando: semTratativa, resolvidas },
    statusRows,
    categoriaRows,
    regiaoRows,
    cidadeRows,
    statusFootnote,
    categoriaFootnote,
    alertas: alertas.slice(0, 3),
    passos,
    bannerRodape,
  }
}

// ---------- Render ----------

function selo(doc: jsPDF, cx: number, cy: number, r: number, logoDataUrl?: string) {
  doc.setFillColor(...WHITE)
  doc.circle(cx, cy, r, 'F')
  if (logoDataUrl) {
    const s = r * 1.75
    doc.addImage(logoDataUrl, 'PNG', cx - s / 2, cy - s / 2, s, s)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(r * 1.2)
    doc.setTextColor(...NAVY)
    doc.text('J', cx, cy + r * 0.4, { align: 'center' })
  }
}

function chip(doc: jsPDF, x: number, y: number, text: string, bg: RGB, fg: RGB): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.5)
  const w = doc.getTextWidth(text) + 5
  doc.setFillColor(...bg)
  doc.roundedRect(x, y, w, 5, 2.5, 2.5, 'F')
  doc.setTextColor(...fg)
  doc.text(text, x + w / 2, y + 3.6, { align: 'center' })
  return w
}

function rodape(doc: jsPDF, pagina: string) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...TXT_FAINT)
  doc.text(FONTE, 14, 290)
  doc.text(pagina, 196, 290, { align: 'right' })
}

function linhaDistribuicao(doc: jsPDF, x: number, y: number, w: number, row: RelatorioLinha, maxValue: number) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...TXT)
  doc.text(doc.splitTextToSize(row.label, w * 0.55)[0], x, y)
  doc.setFont('helvetica', 'bold')
  doc.text(`${row.value} · ${row.pct}%`, x + w, y, { align: 'right' })
  const barY = y + 2
  doc.setFillColor(...TRACK)
  doc.roundedRect(x, barY, w, 2.4, 1.2, 1.2, 'F')
  if (row.value > 0 && maxValue > 0) {
    doc.setFillColor(...row.color)
    doc.roundedRect(x, barY, Math.max(2.4, (row.value / maxValue) * w), 2.4, 1.2, 1.2, 'F')
  }
}

function pagina1(doc: jsPDF, d: RelatorioData, logoDataUrl?: string) {
  // Fundo do corpo
  doc.setFillColor(...BG)
  doc.rect(0, 0, 210, 297, 'F')

  // Header navy
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, 210, 54, 'F')
  selo(doc, 27, 26, 13.5, logoDataUrl)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setCharSpace(0.8)
  doc.setTextColor(...ORANGE)
  doc.text('OUVIDORIA JUSSARA · RELATÓRIO', 46, 15)
  doc.setCharSpace(0)

  doc.setFontSize(21)
  doc.setTextColor(...WHITE)
  doc.text('Indicadores de', 46, 25.5)
  doc.text('atendimento', 46, 34.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(195, 200, 212)
  doc.text('Assistente virtual Ju, da Vereadora Jussara Fernandes — Câmara Municipal de Sorocaba', 46, 42.5)
  doc.setFontSize(7)
  doc.setTextColor(...ORANGE_SOFT)
  doc.text(d.periodoLabel, 46, 48.5)

  // Badge GERADO EM
  doc.setFillColor(...ORANGE)
  doc.roundedRect(163, 11, 33, 20, 2.5, 2.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY_DEEP)
  doc.setFontSize(5.5)
  doc.text('GERADO EM', 179.5, 16, { align: 'center' })
  doc.setFontSize(11)
  doc.text(d.geradoEmDia, 179.5, 22, { align: 'center' })
  doc.setFontSize(5.5)
  doc.text(d.geradoEmAno, 179.5, 26.5, { align: 'center' })

  // ---- Card alerta principal ----
  doc.setFillColor(...WHITE)
  doc.roundedRect(14, 60, 182, 54, 3, 3, 'F')

  chip(doc, 20, 66, 'ALERTA PRINCIPAL', [250, 230, 232], [185, 60, 70])

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12.5)
  doc.setTextColor(...NAVY)
  const headline = d.totalSolicitacoes === 0
    ? 'Nenhuma solicitação registrada no período'
    : `${d.pctParadas}% das solicitações estão paradas aguardando retorno ao cidadão`
  doc.text(doc.splitTextToSize(headline, 108), 80, 68.5)

  // Número gigante
  doc.setFontSize(42)
  doc.setTextColor(...RED)
  doc.text(String(d.semTratativa), 20, 95)
  doc.setFontSize(7.5)
  doc.setTextColor(...TXT_MUTED)
  doc.text('solicitações sem', 20, 102)
  doc.text('tratativa', 20, 106.5)

  // Barra de progresso paradas × tratadas
  const barX = 76
  const barW = 112
  const barY = 86.5
  doc.setFillColor(...TRACK)
  doc.roundedRect(barX, barY, barW, 4.2, 2.1, 2.1, 'F')
  if (d.totalSolicitacoes > 0) {
    const wRed = (d.semTratativa / d.totalSolicitacoes) * barW
    if (wRed > 0) {
      doc.setFillColor(...RED)
      doc.roundedRect(barX, barY, Math.max(4.2, wRed), 4.2, 2.1, 2.1, 'F')
    }
    const wOk = (d.tratadas / d.totalSolicitacoes) * barW
    if (wOk > 0) {
      doc.setFillColor(...NAVY)
      doc.roundedRect(barX + barW - Math.max(4.2, wOk), barY, Math.max(4.2, wOk), 4.2, 2.1, 2.1, 'F')
    }
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...TXT_MUTED)
  doc.text(`${d.semTratativa} sem tratativa`, barX, barY + 8)
  doc.text(`${d.tratadas} tratadas`, barX + barW, barY + 8, { align: 'right' })

  // Mini cards
  doc.setFillColor(246, 244, 251)
  doc.roundedRect(barX, 98.5, 54, 12, 2, 2, 'F')
  doc.roundedRect(barX + 58, 98.5, 54, 12, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...ORANGE)
  doc.text(`${d.taxaResolucao}%`, barX + 3, 106)
  doc.setTextColor(...BLUE)
  doc.text(String(d.emAnalise), barX + 61, 106)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(...TXT_MUTED)
  doc.text('resolução real', barX + 14, 103.5)
  doc.text('até agora', barX + 14, 107.5)
  doc.text('em análise', barX + 73, 103.5)
  doc.text('pela equipe', barX + 73, 107.5)

  // ---- KPIs ----
  const kpis = [
    { valor: String(d.pessoasAtendidas), linhas: ['pessoas atendidas', 'pela Ju'], cor: STEEL },
    { valor: String(d.totalSolicitacoes), linhas: ['solicitações', 'criadas'], cor: GREEN },
    { valor: `${d.pctViraramSolicitacao}%`, linhas: ['dos atendidos', 'viraram solicitação'], cor: ORANGE },
    { valor: String(d.contatosCRM), linhas: ['contatos', 'cadastrados no CRM'], cor: NAVY },
  ]
  kpis.forEach((k, i) => {
    const x = 14 + i * 46
    doc.setFillColor(...WHITE)
    doc.roundedRect(x, 120, 44, 27, 3, 3, 'F')
    doc.setFillColor(...k.cor)
    doc.roundedRect(x + 5, 124, 9, 1.7, 0.85, 0.85, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...k.cor)
    doc.text(k.valor, x + 5, 134.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.8)
    doc.setTextColor(...TXT_MUTED)
    k.linhas.forEach((l, li) => doc.text(l, x + 5, 140 + li * 3.1))
  })

  // ---- Funil ----
  doc.setFillColor(...WHITE)
  doc.roundedRect(14, 153, 182, 118, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text('Do atendimento ao retorno', 22, 162.5)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(...TXT_FAINT)
  doc.text('A demanda chega; o gargalo é a triagem humana', 188, 162.5, { align: 'right' })

  const funilRows: { label: string; value: number; color: RGB }[] = [
    { label: 'Atendidos pela Ju', value: d.funil.atendidos, color: NAVY },
    { label: 'Abriram solicitação', value: d.funil.abriram, color: GREEN },
    { label: 'Aguardando retorno', value: d.funil.aguardando, color: RED },
    { label: 'Resolvidas', value: d.funil.resolvidas, color: BLUE },
  ]
  const maxFunil = Math.max(1, ...funilRows.map((r) => r.value))
  funilRows.forEach((r, i) => {
    const y = 176 + i * 24
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...TXT)
    doc.text(r.label, 22, y + 3)
    doc.setFillColor(...TRACK)
    doc.roundedRect(66, y - 2.5, 122, 8.5, 1.8, 1.8, 'F')
    if (r.value > 0) {
      const w = Math.max(9, (r.value / maxFunil) * 122)
      doc.setFillColor(...r.color)
      doc.roundedRect(66, y - 2.5, w, 8.5, 1.8, 1.8, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...WHITE)
      doc.text(String(r.value), Math.min(66 + w - 2.5, 185.5), y + 3, { align: 'right' })
    } else {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...r.color)
      doc.text('0', 69, y + 3)
    }
  })

  rodape(doc, '1/2')
}

const ALERTA_CORES: Record<NivelAlerta, { bg: RGB; fg: RGB; num: RGB }> = {
  'CRÍTICO': { bg: [250, 230, 232], fg: [185, 28, 28], num: RED },
  'ATENÇÃO': { bg: [252, 240, 222], fg: [200, 120, 40], num: ORANGE },
  'OBSERVAÇÃO': { bg: [235, 237, 243], fg: [90, 98, 115], num: NAVY },
  'EM DIA': { bg: [228, 244, 234], fg: [50, 140, 85], num: GREEN },
}

function pagina2(doc: jsPDF, d: RelatorioData, logoDataUrl?: string) {
  doc.setFillColor(...BG)
  doc.rect(0, 0, 210, 297, 'F')

  // Header slim
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, 210, 20, 'F')
  selo(doc, 19, 10, 6.5, logoDataUrl)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...WHITE)
  doc.text('Status, alertas e próximos passos', 30, 11.5)
  doc.setFontSize(7.5)
  doc.setTextColor(...ORANGE)
  doc.text(`Ouvidoria Jussara · ${d.geradoEmDia}/${d.geradoEmAno}`, 196, 11.5, { align: 'right' })

  // ---- Cards de distribuição ----
  const drawListaCard = (x: number, titulo: string, rows: RelatorioLinha[], footnote: string | null, h: number) => {
    doc.setFillColor(...WHITE)
    doc.roundedRect(x, 26, 88, h, 3, 3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...NAVY)
    doc.text(titulo, x + 7, 34.5)
    const maxV = Math.max(1, ...rows.map((r) => r.value))
    let y = 41
    rows.forEach((r) => {
      linhaDistribuicao(doc, x + 7, y, 74, r, maxV)
      y += 10.5
    })
    if (footnote) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(6.3)
      doc.setTextColor(...TXT_FAINT)
      doc.text(doc.splitTextToSize(footnote, 74), x + 7, y + 3)
    }
  }

  const rowH = 10.5
  const hStatus = 16 + d.statusRows.length * rowH + (d.statusFootnote ? 11 : 5)
  const hCat = 16 + d.categoriaRows.length * rowH + (d.categoriaFootnote ? 11 : 5)
  const hCards = Math.max(hStatus, hCat, 40)
  drawListaCard(14, `Status das ${d.totalSolicitacoes} solicitações`, d.statusRows, d.statusFootnote, hCards)
  drawListaCard(108, 'Solicitações por categoria', d.categoriaRows, d.categoriaFootnote, hCards)

  // ---- Geografia do período: região de Sorocaba + cidades ----
  const hGeo = d.regiaoRows.length > 0 || d.cidadeRows.length > 0 ? 26 : 0
  if (hGeo > 0) {
    const gy = 26 + hCards + 6
    doc.setFillColor(...WHITE)
    doc.roundedRect(14, gy, 182, hGeo, 3, 3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...NAVY)
    doc.text('Geografia do período', 21, gy + 7)
    const geoLinha = (label: string, rows: { label: string; value: number }[], ly: number) => {
      if (rows.length === 0) return
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...TXT)
      doc.text(label, 21, ly)
      const labelW = doc.getTextWidth(label)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...TXT_MUTED)
      const txt = rows.map((r) => `${r.label} ${r.value}`).join(' · ')
      doc.text(doc.splitTextToSize(txt, 174 - labelW)[0], 21 + labelW, ly)
    }
    geoLinha('Região:', d.regiaoRows, gy + 14.5)
    geoLinha('Cidade:', d.cidadeRows, gy + 21.5)
  }

  // ---- Alertas ----
  let y = 26 + hCards + 8 + hGeo
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11.5)
  doc.setTextColor(...NAVY)
  doc.text('Alertas', 14, y)
  y += 4
  const nAlertas = Math.max(1, d.alertas.length)
  const gap = 3
  const wAlerta = (182 - gap * (nAlertas - 1)) / nAlertas
  const hAlerta = 36
  d.alertas.forEach((a, i) => {
    const x = 14 + i * (wAlerta + gap)
    const cores = ALERTA_CORES[a.nivel]
    doc.setFillColor(...WHITE)
    doc.roundedRect(x, y, wAlerta, hAlerta, 3, 3, 'F')
    chip(doc, x + 4, y + 4, a.nivel, cores.bg, cores.fg)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...cores.num)
    doc.text(a.numero, x + 4, y + 17)
    doc.setFontSize(7)
    doc.setTextColor(...TXT)
    doc.text(a.titulo, x + 4, y + 22)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.3)
    doc.setTextColor(...TXT_MUTED)
    doc.text(doc.splitTextToSize(a.descricao, wAlerta - 8).slice(0, 3), x + 4, y + 26.5)
  })
  y += hAlerta + 8

  // ---- Próximos passos ----
  const hItem = 15
  const hBanner = d.bannerRodape ? 10 : 0
  const hPassos = 14 + d.passos.length * hItem + hBanner + 4
  doc.setFillColor(...NAVY)
  doc.roundedRect(14, y, 182, hPassos, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...WHITE)
  doc.text('Próximos passos', 22, y + 8.5)
  let py = y + 13
  d.passos.forEach((p) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...ORANGE)
    doc.text(p.numero, 24, py + 5)
    doc.setFontSize(8.5)
    doc.setTextColor(...WHITE)
    doc.text(p.titulo, 40, py + 4)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(195, 200, 212)
    doc.text(doc.splitTextToSize(p.descricao, 145)[0], 40, py + 8.5)
    py += hItem
  })
  if (d.bannerRodape) {
    doc.setFillColor(...ORANGE)
    doc.roundedRect(20, py + 1, 170, 8, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...NAVY_DEEP)
    doc.text(d.bannerRodape, 105, py + 6.3, { align: 'center' })
  }

  rodape(doc, '2/2')
}

export function relatorioFileName(now = new Date()): string {
  return `relatorio_ouvidoria_jussara_${now.toISOString().slice(0, 10)}.pdf`
}

export function buildRelatorioPdf(data: RelatorioData, logoDataUrl?: string): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  pagina1(doc, data, logoDataUrl)
  doc.addPage()
  pagina2(doc, data, logoDataUrl)
  return doc
}

export function exportRelatorioPdf(data: RelatorioData, logoDataUrl?: string) {
  buildRelatorioPdf(data, logoDataUrl).save(relatorioFileName())
}

export async function loadLogoDataUrl(url = '/logo.png'): Promise<string | undefined> {
  try {
    const res = await fetch(url)
    if (!res.ok) return undefined
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result as string)
      fr.onerror = reject
      fr.readAsDataURL(blob)
    })
  } catch {
    return undefined
  }
}
