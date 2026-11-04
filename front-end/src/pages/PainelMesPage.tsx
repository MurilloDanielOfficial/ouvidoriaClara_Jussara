import * as React from 'react'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Typography, Box, TextField, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Backdrop, Portal, useMediaQuery, useTheme } from '@mui/material'
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileDown,
  FileText,
  Percent,
  RefreshCw,
  UserPlus,
  Users,
} from 'lucide-react'
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import GlassPanel from '../components/GlassPanel'
import PageHeader from '../components/PageHeader'
import PageLoader from '../components/PageLoader'
import SectionTitle from '../components/stats/SectionTitle'
import { colAlpha } from '../components/stats/utils'
import { inputSx } from '../utils/inputSx'
import { getAllOcorrencias, getOcorrenciasPorCidade } from '../services/reclamacaoService'
import { getAllContatosUnificados, getTodosContatosUnificados } from '../services/contatoUnificadoService'
import { listConversas } from '../services/difyService'
import { formatDate, formatRelativeTime } from '../utils/date'
import { normalizeCidades } from '../utils/cityDistribution'
import { formatCategoryName } from '../utils/categories'
import { formatPhoneDisplay } from '../utils/phone'
import { computeRelatorioData, buildRelatorioPdf, relatorioFileName, loadLogoDataUrl } from '../utils/exportRelatorioPdf'
import {
  calcularSinais,
  contatosEntraram,
  diaUTC,
  formatarDelta,
  montarJanelas,
  novosVsReincidentes,
  ocorrenciasNoPeriodo,
  resumoPeriodo,
  rotuloAnterior,
  semTratativa,
  serie12Meses,
  solicitantesNoPeriodo,
  taxaAbertura,
  telefonesAtendidos,
  zonaTratamento,
} from '../utils/painelMes'
import type { ModoPeriodo } from '../utils/painelMes'
import type { ContatoUnificado, ConversaResumo, Ocorrencia } from '../types'

type Selecao = 'mes' | '7' | '30' | '90' | 'total' | 'custom'

const CHIPS: { key: Selecao; label: string }[] = [
  { key: 'mes', label: 'Mês atual' },
  { key: '7', label: '7 dias' },
  { key: '30', label: '30 dias' },
  { key: '90', label: '90 dias' },
  { key: 'total', label: 'Total' },
  { key: 'custom', label: 'Datas' },
]

const fmtNum = new Intl.NumberFormat('pt-BR')

const iso = (d: Date): string => d.toISOString().slice(0, 10)

const fmtDiaMes = (d: Date): string =>
  d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })

/* Tile do painel: mesma casca visual do StatCard (stat-card/stat-enter +
   hairline accent), mas o delta usa o formato textual do painel
   ('▲ N a mais' + referência) em vez do DeltaChip percentual. */
interface TileProps {
  label: string
  valor: string
  icon: React.ElementType
  color: string
  delta: { texto: string; direcao: 'up' | 'down' | 'flat' } | null
  refLabel: string | null
  refValor: string | null
  inverter?: boolean
  delay?: number
  to?: string
  /* Volume de demanda não é bom nem ruim — delta neutro (info) em vez de
     verde/vermelho. */
  deltaNeutro?: boolean
}

const PainelTile: React.FC<TileProps> = ({
  label,
  valor,
  icon: Icon,
  color,
  delta,
  refLabel,
  refValor,
  inverter = false,
  delay = 0,
  to,
  deltaNeutro = false,
}) => {
  const deltaColor =
    !delta || delta.direcao === 'flat'
      ? 'hsl(var(--text-secondary))'
      : deltaNeutro
        ? 'hsl(var(--info-text))'
        : delta.direcao === 'up'
          ? inverter ? 'hsl(var(--error-text))' : 'hsl(var(--success))'
          : inverter ? 'hsl(var(--success))' : 'hsl(var(--error-text))'

  const inner = (
    <GlassPanel
      noBorder
      className="stat-card stat-enter p-5 flex flex-col"
      borderRadius={16}
      style={{ '--card-accent': color, animationDelay: `${delay}ms`, height: '100%' } as React.CSSProperties}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              color: 'hsl(var(--text-secondary))',
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              lineHeight: 1.4,
            }}
          >
            {label}
          </Typography>
        </Box>
        <Box
          aria-hidden="true"
          sx={{
            width: 40,
            height: 40,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: `linear-gradient(135deg, ${colAlpha(color, 0.16)}, ${colAlpha(color, 0.06)})`,
            border: `1px solid ${colAlpha(color, 0.28)}`,
          }}
        >
          <Icon size={18} style={{ color }} />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, flexWrap: 'wrap', mt: 0.5 }}>
        <Typography
          sx={{
            color: 'hsl(var(--text-primary))',
            fontWeight: 700,
            fontSize: 30,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {valor}
        </Typography>
        {delta && (
          <Typography
            component="span"
            sx={{ color: deltaColor, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            {delta.texto}
          </Typography>
        )}
      </Box>
      {refLabel && refValor != null && (
        <Typography sx={{ color: 'hsl(var(--text-secondary) / 0.7)', fontSize: 10.5, mt: 0.5 }}>
          {refLabel} ({refValor})
        </Typography>
      )}
      <Box aria-hidden="true" sx={{ mt: 'auto', pt: 1.5 }}>
        <Box
          sx={{
            height: 3,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${colAlpha(color, 0.9)}, ${colAlpha(color, 0.15)})`,
            boxShadow: `0 0 12px ${colAlpha(color, 0.35)}`,
          }}
        />
      </Box>
    </GlassPanel>
  )

  if (!to) return inner
  return (
    <Link to={to} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      {inner}
    </Link>
  )
}

const PainelMesPage: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [sel, setSel] = useState<Selecao>('mes')
  const [selAntesCustom, setSelAntesCustom] = useState<Selecao>('mes')
  const [customDe, setCustomDe] = useState('')
  const [customAte, setCustomAte] = useState('')
  const [conversas, setConversas] = useState<ConversaResumo[]>([])
  const [contatos, setContatos] = useState<ContatoUnificado[]>([])
  const [contatosProntos, setContatosProntos] = useState(false)
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [geoAtual, setGeoAtual] = useState<Map<string, number> | null>(null)
  const [geoAnt, setGeoAnt] = useState<Map<string, number> | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [atualizando, setAtualizando] = useState(false)
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const grafScrollRef = useRef<HTMLDivElement | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [pdfPreview, setPdfPreview] = useState<{ url: string; fileName: string } | null>(null)
  const cancelExportRef = useRef(false)
  // Safari/iOS não renderiza PDFs em iframe (todo browser iOS é WebKit) —
  // nesse caso o preview abre o blob em nova aba via link normal.
  const isIOS = useMemo(() =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  [])

  /* Carga leve que destrava a página em ~1 s: só conversas + solicitações.
     A base de contatos (dezenas de milhares na Jussara — ~30 MB, ~1 min se
     pedida de uma vez) vai no efeito abaixo, filtrada pela janela do período
     no servidor — exceto no modo "total", que precisa dela inteira e chega
     em background paginada sem travar a pintura. */
  const carregar = useCallback((silencioso = false) => {
    if (!silencioso) setLoading(true)
    else setAtualizando(true)
    Promise.all([
      listConversas().catch(() => [] as ConversaResumo[]),
      getAllOcorrencias(undefined, 0, 0),
    ])
      .then(([cv, oc]) => {
        setConversas(cv)
        setOcorrencias(oc.ocorrencias || [])
        setAtualizadoEm(new Date())
        if (silencioso) setRefreshKey((k) => k + 1) // re-dispara stats/cidades só no refresh manual
      })
      .catch(() => setError('Erro ao carregar o painel'))
      .finally(() => {
        setLoading(false)
        setAtualizando(false)
      })
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const modo: ModoPeriodo =
    sel === 'custom' ? 'custom' : sel === 'total' ? 'total' : sel === 'mes' ? 'mes' : 'dias'
  const periodoDias = sel === '7' ? 7 : sel === '30' ? 30 : sel === '90' ? 90 : 30
  const periodoCustom = sel === 'custom' ? { inicio: customDe, fim: customAte } : null

  const janelasCalc = useMemo(
    () => montarJanelas(modo, periodoDias, periodoCustom),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modo, periodoDias, customDe, customAte],
  )
  /* Enquanto a data custom está incompleta (campo apagado no meio da edição),
     mantém a última janela válida — sem isso metricas vira null e hero/tiles/
     sinais desmontam de uma vez, fazendo a página inteira pular de altura. */
  const janelasRef = useRef(janelasCalc)
  if (janelasCalc) janelasRef.current = janelasCalc
  const janelas = janelasCalc ?? janelasRef.current

  /* Contatos do recorte: filtra por data_criacao no servidor (inicio cobre a
     janela anterior junto; fim é exclusivo no back → +1 dia). Isso basta para
     "contatos novos", o PDF e entraram/entraramAnt.
     A classificação novos×reincidentes também precisa da dataCriacao dos
     atendidos que ficaram fora do recorte — vai um lookup por telefone
     (cacheável, dataCriacao não muda) em vez da base inteira.
     No modo "total" a janela é a base toda → paginação paralela completa. */
  const entradaCache = useRef(new Map<string, ContatoUnificado | null>())
  const [classifPronta, setClassifPronta] = useState(false)
  useEffect(() => {
    if (!janelas) return
    let alive = true
    setContatosProntos(false)
    setClassifPronta(false)
    const { atual, anterior } = janelas
    // inicio/fim vão como dia civil — o back já trata fim como inclusivo
    // (controllers somam +24h antes do WHERE ... < fim).
    const req = modo === 'total'
      ? getTodosContatosUnificados()
      : getAllContatosUnificados(0, 0, { inicio: iso(anterior?.inicio ?? atual.inicio), fim: iso(atual.fim) })
    req.then(async (ct) => {
      if (!alive) return
      const porTel = new Map<string, ContatoUnificado>()
      for (const c of ct.contatos || []) if (c.telefone) porTel.set(c.telefone, c)
      setContatos([...porTel.values()])
      setContatosProntos(true)

      const atendidos = [...telefonesAtendidos(conversas, atual)]
      const cache = entradaCache.current
      const faltam = [...new Set(atendidos.filter((t) => t && !porTel.has(t) && !cache.has(t)))]
      for (let i = 0; i < faltam.length; i += 4) {
        const lote = faltam.slice(i, i + 4)
        const achados = await Promise.all(lote.map((tel) =>
          getAllContatosUnificados(10, 0, { search: tel.replace(/\D/g, '') })
            .then((r) => {
              const dig = tel.replace(/\D/g, '')
              const m = r.contatos.find((c) => c.telefone === tel || c.telefone.replace(/\D/g, '') === dig)
              return [tel, m ?? null] as const
            })
            .catch(() => [tel, null] as const),
        ))
        if (!alive) return
        for (const [tel, row] of achados) cache.set(tel, row)
      }
      if (!alive) return
      /* Junta os contatos achados por lookup ao recorte — entraram filtra por
         janela de qualquer jeito; os extras só alimentam novosVsReincidentes. */
      setContatos((prev) => {
        const all = new Map(prev.map((c) => [c.telefone, c]))
        for (const t of atendidos) {
          const row = cache.get(t)
          if (row && !all.has(row.telefone)) all.set(row.telefone, row)
        }
        return [...all.values()]
      })
      setClassifPronta(true)
    }).catch(() => {
      if (!alive) return
      setContatos([])
      setContatosProntos(true)
      setClassifPronta(true)
    })
    return () => { alive = false }
  }, [janelas, conversas, modo, refreshKey])

  // Distribuição por cidade do período — /ocorrencias/cidades filtrado pela
  // mesma janela do cliente (fim inclusivo igual ao resto do painel).
  // Não usa /stats.regioes: aquele endpoint é stub no backend (retorna []).
  useEffect(() => {
    if (!janelas) return
    let alive = true
    setGeoLoading(true)
    const reqs = [getOcorrenciasPorCidade(iso(janelas.atual.inicio), iso(janelas.atual.fim))]
    if (janelas.anterior) {
      reqs.push(getOcorrenciasPorCidade(iso(janelas.anterior.inicio), iso(janelas.anterior.fim)))
    }
    Promise.all(reqs)
      .then(([atual, ant]) => {
        if (!alive) return
        setGeoAtual(new Map(normalizeCidades(atual).map((c) => [c.cidade, c.total])))
        setGeoAnt(ant ? new Map(normalizeCidades(ant).map((c) => [c.cidade, c.total])) : null)
      })
      .catch(() => {
        if (!alive) return
        setGeoAtual(null)
        setGeoAnt(null)
      })
      .finally(() => {
        if (alive) setGeoLoading(false)
      })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [janelas, refreshKey])

  // Trava o scroll da página enquanto o overlay de geração está ativo
  useEffect(() => {
    if (!exporting) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [exporting])

  // Relatório em PDF do período selecionado — reaproveita as coleções já
  // carregadas pelo painel (contatos e conversas completos, ocorrências já
  // filtradas pela janela em m.solAtual). No modo Total o PDF sai sem filtro
  // de datas ("todo o histórico").
  const handleExportRelatorio = async () => {
    if (!janelas || !m || exporting) return
    cancelExportRef.current = false
    setExporting(true)
    setExportError('')
    try {
      const logoDataUrl = await loadLogoDataUrl()
      if (cancelExportRef.current) return
      const ehTotal = modo === 'total'
      const data = computeRelatorioData(
        m.solAtual,
        contatos,
        conversas,
        ehTotal ? undefined : iso(janelas.atual.inicio),
        ehTotal ? undefined : iso(janelas.atual.fim),
        undefined,
        geoAtual ?? undefined,
      )
      const doc = buildRelatorioPdf(data, logoDataUrl)
      const url = URL.createObjectURL(doc.output('blob'))
      setPdfPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev.url)
        return { url, fileName: relatorioFileName() }
      })
    } catch {
      setExportError('Não foi possível gerar o relatório. Tente novamente.')
    } finally {
      setExporting(false)
    }
  }

  const closePdfPreview = () => {
    if (pdfPreview) URL.revokeObjectURL(pdfPreview.url)
    setPdfPreview(null)
  }

  const handleCancelExport = () => {
    cancelExportRef.current = true
    setExporting(false)
  }

  // No mobile o scroll do gráfico começa no FIM: a série é cronológica e o
  // mês atual é a última barra — sem isso a tela abriria nos meses antigos.
  useEffect(() => {
    const el = grafScrollRef.current
    if (!isMobile || !el) return
    el.scrollLeft = el.scrollWidth
  }, [isMobile, ocorrencias])

  const metricas = useMemo(() => {
    if (!janelas) return null
    const { atual, anterior } = janelas

    const atendidos = telefonesAtendidos(conversas, atual)
    const atendidosAnt = anterior ? telefonesAtendidos(conversas, anterior) : null

    const entraram = contatosEntraram(contatos, atual)
    const entraramAnt = anterior ? contatosEntraram(contatos, anterior) : null

    const solAtual = ocorrenciasNoPeriodo(ocorrencias, atual)
    const solAnt = anterior ? ocorrenciasNoPeriodo(ocorrencias, anterior) : null

    const semTrat = semTratativa(ocorrencias, atual)
    const semTratAnt = anterior ? semTratativa(ocorrencias, anterior) : null

    const solicitantes = solicitantesNoPeriodo(ocorrencias, atual)
    const taxa = taxaAbertura(atendidos, solicitantes)
    const taxaAnt =
      anterior && atendidosAnt
        ? taxaAbertura(atendidosAnt, solicitantesNoPeriodo(ocorrencias, anterior))
        : null

    const { novos, reincidentes } = novosVsReincidentes(conversas, contatos, atual)

    const resumoAtual = resumoPeriodo(ocorrencias, atual)
    const resumoAnt = anterior ? resumoPeriodo(ocorrencias, anterior) : null

    return {
      atendidos,
      atendidosAnt,
      entraram,
      entraramAnt,
      solAtual,
      solAnt,
      semTrat,
      semTratAnt,
      solicitantes,
      abriram: [...atendidos].filter((t) => solicitantes.has(t)).length,
      taxa,
      taxaAnt,
      novos,
      reincidentes,
      resumoAtual,
      resumoAnt,
    }
  }, [janelas, conversas, contatos, ocorrencias])

  // Série histórica de 12 meses e últimas solicitações — não seguem o chip de
  // período (igual à Ângela: a tendência é sempre o panorama completo).
  const serie12 = useMemo(() => serie12Meses(ocorrencias, conversas), [ocorrencias, conversas])
  const ultimas = useMemo(
    () =>
      [...ocorrencias]
        .sort((a, b) => (diaUTC(b.dataCriacao)?.getTime() ?? 0) - (diaUTC(a.dataCriacao)?.getTime() ?? 0))
        .slice(0, 6),
    [ocorrencias],
  )
  const ultimaConversa = useMemo(() => {
    let max: Date | null = null
    for (const c of conversas) {
      const d = diaUTC(c.criadoEm)
      if (d && (!max || d > max)) max = d
    }
    return max
  }, [conversas])
  const ultimaSolicitacao = useMemo(() => {
    let max: Date | null = null
    for (const o of ocorrencias) {
      const d = diaUTC(o.dataCriacao)
      if (d && (!max || d > max)) max = d
    }
    return max
  }, [ocorrencias])
  const taxaHistorica = useMemo(() => {
    const atend = new Set(conversas.filter((c) => c.telefone).map((c) => c.telefone))
    const solicit = new Set(ocorrencias.filter((o) => o.telefone).map((o) => o.telefone))
    const abriram = [...solicit].filter((tel) => atend.has(tel)).length
    return { taxa: taxaAbertura(atend, solicit), atendidas: atend.size, abriram }
  }, [conversas, ocorrencias])

  const sinais = useMemo(
    () =>
      metricas
        ? calcularSinais(metricas.resumoAtual, metricas.resumoAnt, ultimaConversa, undefined,
            /* só emite sinais de cidade depois que os dados reais chegaram —
               antes disso, comparar com mapa vazio geraria deltas falsos */
            geoLoading || !geoAtual ? undefined : {
              atual: geoAtual,
              anterior: janelas?.anterior && geoAnt ? geoAnt : null,
            })
        : null,
    [metricas, ultimaConversa, geoAtual, geoAnt, geoLoading, janelas],
  )

  // "Onde focar": top 6 categorias do período com delta vs anterior
  const categoriasFoco = useMemo(() => {
    if (!metricas) return [] as { cat: string; qtd: number; anterior: number | null }[]
    const ant = metricas.resumoAnt?.porCategoria
    return [...metricas.resumoAtual.porCategoria.entries()]
      .map(([cat, qtd]) => ({ cat, qtd, anterior: ant != null ? (ant.get(cat) ?? 0) : null }))
      .sort((a, b) => b.qtd - a.qtd || a.cat.localeCompare(b.cat))
      .slice(0, 6)
  }, [metricas])

  /* Leitura do "onde focar" — mesma regra da Ângela: compara na UNIÃO das
     categorias (inclui as que zeraram). pioraram = subiu vs anterior;
     melhoraram = caiu, ordenado pela maior queda. */
  const focoLeitura = useMemo(() => {
    if (!metricas?.resumoAnt) return { pioraram: null as string[] | null, melhoraram: [] as { cat: string; antes: number; atual: number }[] }
    const at = metricas.resumoAtual.porCategoria
    const an = metricas.resumoAnt.porCategoria
    const pioraram: string[] = []
    const melhoraram: { cat: string; antes: number; atual: number }[] = []
    for (const cat of new Set([...at.keys(), ...an.keys()])) {
      const u = at.get(cat) || 0
      const a = an.get(cat) || 0
      if (u > a) pioraram.push(cat)
      else if (u < a) melhoraram.push({ cat, antes: a, atual: u })
    }
    melhoraram.sort((x, y) => (x.atual - x.antes) - (y.atual - y.antes))
    return { pioraram, melhoraram }
  }, [metricas])

  const cidades = useMemo(() => {
    if (!geoAtual) return []
    const nomes = new Set<string>([...geoAtual.keys(), ...(geoAnt?.keys() ?? [])])
    return [...nomes]
      .map((cidade) => {
        const antQtd = janelas?.anterior ? (geoAnt?.get(cidade) ?? 0) : null
        return { cidade, atual: geoAtual.get(cidade) ?? 0, anterior: antQtd }
      })
      .sort((a, b) => b.atual - a.atual || a.cidade.localeCompare(b.cidade))
      .slice(0, 5)
  }, [geoAtual, geoAnt, janelas])

  if (loading) {
    return <PageLoader message="Carregando painel..." />
  }

  if (error) {
    return (
      <Box className="page-root"><Typography color="error">{error}</Typography></Box>
    )
  }

  const rotuloAnt = rotuloAnterior(modo, periodoDias)
  // Título do hero reage ao chip — "do período" genérico não diz nada.
  const tituloHero =
    modo === 'mes'
      ? 'Solicitações totais do mês até agora'
      : modo === 'dias'
        ? `Solicitações nos últimos ${periodoDias} dias`
        : modo === 'custom'
          ? 'Solicitações no período selecionado'
          : 'Solicitações em todo o histórico'
  const fmtJanelaAnt = janelas?.anterior
    ? ` (${fmtDiaMes(janelas.anterior.inicio)} a ${fmtDiaMes(janelas.anterior.fim)})`
    : ''
  const subtitulo = janelas
    ? `${fmtDiaMes(janelas.atual.inicio)} a ${fmtDiaMes(janelas.atual.fim)}${
        modo === 'mes'
          ? ` · comparado ao mesmo período do mês anterior${fmtJanelaAnt}`
          : modo === 'dias'
            ? ` · comparado aos ${periodoDias} dias anteriores${fmtJanelaAnt}`
            : modo === 'custom'
              ? ` · comparado ao período anterior${fmtJanelaAnt}`
              : ' · todo o histórico'
      }`
    : 'Selecione as datas para montar o período'

  const fmtTaxa = (v: number | null): string =>
    v == null ? '—' : `${v.toFixed(1).replace('.', ',')}%`

  const m = metricas

  /* Hero — essência do período (adaptação do hero NPS da Ângela): número de
     solicitações, zona de saúde, delta, balanço por status, frase de leitura
     e chamada de ação quando há fila parada. */
  const hero = (() => {
    if (!m) return null
    const r = m.resumoAtual
    const a = m.resumoAnt
    const temComparacao = a != null && a.total > 0
    const zona = zonaTratamento(r)
    const corZona = !zona
      ? 'hsl(var(--text-secondary))'
      : zona.classe === 'excelencia'
        ? 'hsl(var(--success))'
        : zona.classe === 'qualidade'
          ? 'hsl(var(--info-text))'
          : zona.classe === 'atencao'
            ? 'hsl(var(--warning))'
            : 'hsl(var(--error-text))'
    let frase: string
    let cor: string
    if (r.total === 0) {
      frase = 'Sem solicitações no período selecionado.'
      cor = 'hsl(var(--text-secondary))'
    } else if (r.semTratativa === r.total) {
      frase = `Atenção: nenhuma das ${r.total} ${r.total === 1 ? 'solicitação foi tratada' : 'solicitações foi tratada'} neste período.`
      cor = 'hsl(var(--error-text))'
    } else if (temComparacao && r.semTratativa > a!.semTratativa) {
      frase = 'Atenção: as solicitações sem tratativa cresceram no período.'
      cor = 'hsl(var(--error-text))'
    } else if (r.semTratativa === 0) {
      frase = 'Todas as solicitações do período foram tratadas.'
      cor = 'hsl(var(--success))'
    } else if (temComparacao && r.semTratativa < a!.semTratativa) {
      frase = 'Menos pendências que no período anterior — continue tratando.'
      cor = 'hsl(var(--success))'
    } else if (r.semTratativa > 0) {
      frase = `Atenção: ${r.semTratativa} ${r.semTratativa === 1 ? 'solicitação' : 'solicitações'} ainda aguardam tratativa.`
      cor = 'hsl(var(--error-text))'
    } else {
      frase = 'Cenário estável em relação ao período anterior.'
      cor = 'hsl(var(--text-secondary))'
    }
    return { frase, cor, zona, corZona }
  })()

  const balanco = m
    ? [
        { label: 'concluídas', qtd: m.resumoAtual.concluidas, cor: 'hsl(var(--success))' },
        { label: 'em análise', qtd: m.resumoAtual.emAnalise, cor: 'hsl(var(--warning))' },
        { label: 'sem tratativa', qtd: m.resumoAtual.semTratativa, cor: 'hsl(var(--error))' },
        { label: 'desqualificadas', qtd: m.resumoAtual.desqualificadas, cor: 'hsl(var(--text-secondary))' },
      ]
    : []

  const piorMesIdx = serie12.reduce(
    (acc, p, i) => (p.solicitacoes > 0 && (acc < 0 || p.solicitacoes > serie12[acc].solicitacoes) ? i : acc),
    -1,
  )

  return (
    <Box className="page-root">
      <PageHeader
        title="Visão Geral"
        action={
          <Button
            variant="contained"
            size="small"
            onClick={handleExportRelatorio}
            disabled={exporting || !janelas || !m || !contatosProntos}
            title={!contatosProntos ? 'Carregando a base de contatos…' : undefined}
            startIcon={exporting || !contatosProntos ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <FileDown size={16} />}
            sx={{
              bgcolor: 'hsl(var(--primary))',
              textTransform: 'none',
              borderRadius: 2,
              fontWeight: 600,
              fontSize: 13,
              '&:hover': { bgcolor: 'hsl(var(--primary-hover))' },
              '&.Mui-disabled': { bgcolor: 'hsl(var(--primary) / 0.5)', color: '#fff' },
            }}
          >
            {exporting ? 'Gerando…' : 'Gerar Relatório'}
          </Button>
        }
      />

      {/* Chips de período */}
      <GlassPanel className="stat-enter px-4 py-3" borderRadius={14} style={{ animationDelay: '0ms' }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.9, mr: { sm: 0.5 } }}>
            <Calendar size={15} style={{ color: 'hsl(var(--accent))' }} aria-hidden="true" />
            <Typography
              sx={{
                color: 'hsl(var(--text-secondary))',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Período
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, justifyContent: 'center' }}>
            {CHIPS.map((chip) => {
              const ativo = sel === chip.key
              return (
                <button
                  key={chip.key}
                  onClick={() => {
                    if (chip.key === 'custom') {
                      // Chip de datas é toggle como na Ângela: clicar de novo
                      // fecha o filtro e volta à seleção anterior.
                      if (sel === 'custom') { setSel(selAntesCustom); return }
                      const hoje = new Date()
                      const fmtLocal = (d: Date) =>
                        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                      if (!customAte) setCustomAte(fmtLocal(hoje))
                      if (!customDe) setCustomDe(fmtLocal(new Date(hoje.getTime() - 29 * 24 * 60 * 60 * 1000)))
                      setSel('custom')
                      return
                    }
                    setSelAntesCustom(chip.key)
                    setSel(chip.key)
                  }}
                  aria-pressed={ativo}
                  {...(chip.key === 'custom' ? { 'aria-expanded': ativo } : {})}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: ativo ? 700 : 500,
                    fontFamily: "'Inter', sans-serif",
                    cursor: 'pointer',
                    border: `1px solid ${ativo ? 'hsl(var(--accent))' : 'hsl(var(--border))'}`,
                    background: ativo ? 'hsl(var(--accent) / 0.16)' : 'transparent',
                    color: ativo ? 'hsl(var(--accent))' : 'hsl(var(--text-secondary))',
                    transition: 'all var(--dur-fast) var(--ease-brand)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: chip.key === 'custom' ? 5 : 0,
                  }}
                >
                  {chip.key === 'custom' && <Calendar size={13} aria-hidden="true" />}
                  {chip.label}
                  {chip.key === 'custom' && (
                    <ChevronDown
                      size={12}
                      aria-hidden="true"
                      style={{
                        transition: 'transform var(--dur-fast) var(--ease-brand)',
                        transform: ativo ? 'rotate(180deg)' : 'none',
                      }}
                    />
                  )}
                </button>
              )
            })}
          </Box>
        </Box>

        {sel === 'custom' && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flexWrap: 'wrap',
              justifyContent: 'center',
              mt: 1.5,
              pt: 1.5,
              borderTop: '1px solid hsl(var(--border) / 0.5)',
            }}
          >
            <TextField
              type="date"
              size="small"
              label="De"
              InputLabelProps={{ shrink: true }}
              inputProps={{ style: { textAlign: isMobile ? 'center' : 'left' }, autoComplete: 'off', max: customAte || undefined }}
              value={customDe}
              onChange={(e) => { const v = e.target.value; setCustomDe(v && customAte && v > customAte ? customAte : v) }}
              sx={{ ...inputSx, minWidth: 140 }}
            />
            <TextField
              type="date"
              size="small"
              label="Até"
              InputLabelProps={{ shrink: true }}
              inputProps={{ style: { textAlign: isMobile ? 'center' : 'left' }, autoComplete: 'off', min: customDe || undefined }}
              value={customAte}
              onChange={(e) => { const v = e.target.value; setCustomAte(v && customDe && v < customDe ? customDe : v) }}
              sx={{ ...inputSx, minWidth: 140 }}
            />
          </Box>
        )}
      </GlassPanel>

      {exportError && (
        <Typography sx={{ color: 'hsl(var(--error-text))', fontSize: 12, textAlign: 'center', mt: 1 }}>
          {exportError}
        </Typography>
      )}

      {/* Subtítulo centralizado com o período selecionado */}
      <Typography
        sx={{
          textAlign: 'center',
          color: 'hsl(var(--text-secondary))',
          fontSize: 13,
          fontWeight: 500,
          mt: 2,
          mb: 1.5,
        }}
      >
        {subtitulo}
      </Typography>

      {m && hero && (
        <>
          {/* Hero — essência do período (adaptação do hero NPS da Ângela) */}
          <GlassPanel
            className="stat-card stat-enter p-5"
            borderRadius={16}
            style={{ '--card-accent': 'hsl(var(--primary-light))', animationDelay: '20ms' } as React.CSSProperties}
          >
            <Typography
              sx={{
                color: 'hsl(var(--text-secondary))',
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                lineHeight: 1.4,
                textAlign: 'center',
              }}
            >
              {tituloHero}
            </Typography>
            <Typography
              sx={{
                color: hero.corZona ?? 'hsl(var(--text-primary))',
                fontWeight: 900,
                fontSize: 'clamp(3rem, 12vw, 5rem)',
                letterSpacing: '-0.03em',
                lineHeight: 0.95,
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'center',
              }}
            >
              {fmtNum.format(m.solAtual.length)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1.25, flexWrap: 'wrap', mt: 1 }}>
              {hero.zona && (
                <Typography
                  component="span"
                  sx={{
                    color: hero.corZona,
                    fontSize: 12,
                    fontWeight: 700,
                    px: 1,
                    py: 0.25,
                    borderRadius: 999,
                    bgcolor: colAlpha(hero.corZona, 0.12),
                    border: `1px solid ${colAlpha(hero.corZona, 0.35)}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Situação: {hero.zona.nome}
                </Typography>
              )}
              {(() => {
                const d = formatarDelta(m.solAtual.length, m.solAnt?.length)
                if (!d) return null
                return (
                  <Typography component="span" sx={{ color: 'hsl(var(--info-text))', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {d.texto}
                  </Typography>
                )
              })()}
              {rotuloAnt && m.solAnt && (
                <Typography component="span" sx={{ color: 'hsl(var(--text-secondary) / 0.7)', fontSize: 10.5 }}>
                  {rotuloAnt} ({fmtNum.format(m.solAnt.length)})
                </Typography>
              )}
            </Box>

            {m.solAtual.length > 0 ? (
              <Box sx={{ mt: 1.5, maxWidth: 520, mx: 'auto' }}>
                <Box
                  role="img"
                  aria-label={`${m.resumoAtual.concluidas} concluídas, ${m.resumoAtual.emAnalise} em análise, ${m.resumoAtual.semTratativa} sem tratativa, ${m.resumoAtual.desqualificadas} desqualificadas`}
                  sx={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', bgcolor: 'hsl(var(--surface-2))' }}
                >
                  {balanco.filter((s) => s.qtd > 0).map((s) => (
                    <Box key={s.label} sx={{ flexGrow: s.qtd, bgcolor: s.cor }} />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', mt: 1 }}>
                  {balanco.map((s) => (
                    <Box key={s.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      <Box aria-hidden="true" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.cor }} />
                      <Typography sx={{ color: 'hsl(var(--text-secondary))', fontSize: 11.5 }}>
                        {fmtNum.format(s.qtd)} {s.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : null}

            <Typography sx={{ color: hero.cor, fontSize: 13, fontWeight: 600, mt: 1.5, textAlign: 'center' }}>
              {hero.frase}
              {m.semTrat > 0 && (
                <>
                  {' '}
                  <Link
                    to="/solicitacoes"
                    style={{
                      color: 'hsl(var(--error-text))',
                      fontWeight: 700,
                      textDecoration: 'underline',
                      textUnderlineOffset: 3,
                      textDecorationColor: 'hsl(var(--error) / 0.5)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    tratar agora <span className="nudge-arrow" aria-hidden="true">→</span>
                  </Link>
                </>
              )}
            </Typography>
          </GlassPanel>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' },
              gap: 2,
              alignItems: 'stretch',
              mt: 2,
            }}
          >
            <PainelTile
              label="Contatos novos no período selecionado"
              valor={contatosProntos ? fmtNum.format(m.entraram.size) : '…'}
              icon={UserPlus}
              color="hsl(var(--warning))"
              delta={contatosProntos ? formatarDelta(m.entraram.size, m.entraramAnt?.size) : null}
              refLabel={rotuloAnt}
              refValor={contatosProntos && m.entraramAnt ? fmtNum.format(m.entraramAnt.size) : null}
              delay={60}
            />
            <PainelTile
              label="Pessoas atendidas"
              valor={fmtNum.format(m.atendidos.size)}
              icon={Users}
              color="hsl(var(--info))"
              delta={formatarDelta(m.atendidos.size, m.atendidosAnt?.size)}
              refLabel={rotuloAnt}
              refValor={m.atendidosAnt ? fmtNum.format(m.atendidosAnt.size) : null}
              delay={120}
            />
            <PainelTile
              label="Sem tratativa"
              valor={fmtNum.format(m.semTrat)}
              icon={Clock3}
              color="hsl(var(--error))"
              delta={formatarDelta(m.semTrat, m.semTratAnt)}
              refLabel={rotuloAnt}
              refValor={m.semTratAnt != null ? fmtNum.format(m.semTratAnt) : null}
              inverter
              delay={180}
              to="/solicitacoes"
            />
            <PainelTile
              label="Concluídas"
              valor={fmtNum.format(m.resumoAtual.concluidas)}
              icon={CheckCircle2}
              color="hsl(var(--success))"
              delta={formatarDelta(m.resumoAtual.concluidas, m.resumoAnt?.concluidas)}
              refLabel={rotuloAnt}
              refValor={m.resumoAnt ? fmtNum.format(m.resumoAnt.concluidas) : null}
              delay={240}
            />
            <PainelTile
              label="Taxa de abertura"
              valor={fmtTaxa(m.taxa)}
              icon={Percent}
              color="hsl(var(--accent))"
              delta={m.taxa != null ? formatarDelta(m.taxa, m.taxaAnt, 'pontos') : null}
              refLabel={rotuloAnt}
              refValor={m.taxaAnt != null ? fmtTaxa(m.taxaAnt) : null}
              delay={300}
            />
          </Box>

          {/* Linha de origem (vg-mes__origem da Ângela): o funil inteiro numa
              linha — quem abriu solicitação + novos × reincidentes. */}
          {m.atendidos.size > 0 && (
            <Typography sx={{ mt: 1.5, color: 'hsl(var(--text-secondary))', fontSize: 13 }}>
              <b>{fmtNum.format(m.abriram)}</b> das {fmtNum.format(m.atendidos.size)}{' '}
              pessoas atendidas abriram solicitação
              {classifPronta && (
                <>
                  {' · '}<b>{fmtNum.format(m.novos)}</b> novas, <b>{fmtNum.format(m.reincidentes)}</b> reincidentes
                  {' — novo = entrou no CRM no período'}
                  {m.novos > m.reincidentes
                    ? ' (período de captação)'
                    : m.reincidentes > m.novos
                      ? ' (maioria reincidente)'
                      : ' (equilíbrio)'}
                </>
              )}
            </Typography>
          )}

          {/* Insights valiosos — relatos de atenção/observação/positivo (Ângela) */}
          <SectionTitle>Insights valiosos</SectionTitle>
          {sinais && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {(() => {
                const itens = [
                  ...sinais.atencao.map((s) => ({ nivel: 'atencao', Icon: AlertTriangle, cor: 'hsl(var(--error-text))', ...s })),
                  ...sinais.observacao.map((s) => ({ nivel: 'observacao', Icon: AlertCircle, cor: 'hsl(var(--warning))', ...s })),
                  ...sinais.positivo.map((s) => ({ nivel: 'positivo', Icon: CheckCircle2, cor: 'hsl(var(--success))', ...s })),
                ]
                if (itens.length === 0) {
                  return (
                    <GlassPanel className="stat-enter px-4 py-3" borderRadius={12} style={{ animationDelay: '360ms' }}>
                      <Typography sx={{ color: 'hsl(var(--text-secondary))', fontSize: 13 }}>
                        🟢 Período estável — nada relevante mudou em relação ao anterior.
                      </Typography>
                    </GlassPanel>
                  )
                }
                return itens.map((s, i) => (
                  <GlassPanel
                    key={`${s.nivel}-${i}`}
                    className="stat-enter px-4 py-3"
                    borderRadius={12}
                    style={{ animationDelay: `${360 + i * 40}ms`, borderLeft: `3px solid ${s.cor}` }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
                      <s.Icon size={15} style={{ color: s.cor, flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                      <Typography sx={{ color: 'hsl(var(--text-primary))', fontSize: 13, flex: 1, minWidth: 200 }}>
                        {s.texto}
                      </Typography>
                      {s.acao && (
                        <Link
                          to={s.acao.para}
                          style={{
                            color: s.cor,
                            fontSize: 12,
                            fontWeight: 700,
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                            alignSelf: 'center',
                          }}
                        >
                          {s.acao.label} <span className="nudge-arrow" aria-hidden="true">→</span>
                        </Link>
                      )}
                    </Box>
                  </GlassPanel>
                ))
              })()}
            </Box>
          )}

          {/* Tendência — últimos 12 meses (não segue o chip, igual à Ângela) */}
          <SectionTitle>Tendência — últimos 12 meses</SectionTitle>
          <GlassPanel className="stat-enter p-5" borderRadius={16} style={{ animationDelay: '400ms' }}>
            {/* No mobile o gráfico fica mais largo que a tela e rola na
                horizontal — mesmo padrão da Ângela (12 meses legíveis) */}
            <Box ref={grafScrollRef} sx={{ width: '100%', overflowX: isMobile ? 'auto' : 'hidden', WebkitOverflowScrolling: 'touch' }}>
              <Box sx={{ width: '100%', minWidth: isMobile ? 560 : 0, height: 260 }}>
                <ResponsiveContainer>
                  <ComposedChart data={serie12} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" interval={0} tick={{ fontSize: 11, fill: 'hsl(var(--text-secondary))' }} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-secondary))' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: 'hsl(var(--text-primary))', fontWeight: 700 }}
                    formatter={(v: number, name: string) => [fmtNum.format(v), name]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(value: string) => <span style={{ color: 'hsl(var(--text-secondary))' }}>{value}</span>}
                  />
                  <Bar dataKey="solicitacoes" name="Solicitações" fill="hsl(var(--primary-light))" radius={[4, 4, 0, 0]} maxBarSize={34}>
                    {serie12.map((p, i) => (
                      <Cell key={p.chave} fill={i === piorMesIdx ? 'hsl(var(--warning))' : 'hsl(var(--primary-light))'} />
                    ))}
                  </Bar>
                  <Line type="monotone" dataKey="atendidos" name="Pessoas atendidas" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--accent))' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Box>
            </Box>
            <Typography sx={{ color: 'hsl(var(--text-secondary) / 0.75)', fontSize: 11, mt: 1 }}>
              Barras: solicitações por mês · Linha: pessoas atendidas (última conversa no mês){isMobile ? ' · arraste para o lado para ver todos os meses' : ''}
            </Typography>
            {piorMesIdx >= 0 && (
              <Typography
                component={Link}
                to="/solicitacoes"
                sx={{
                  display: 'block',
                  mt: 1,
                  color: 'hsl(var(--warning))',
                  fontSize: 12.5,
                  fontWeight: 600,
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                📈 Mês com mais solicitações: {serie12[piorMesIdx].labelLongo} · {fmtNum.format(serie12[piorMesIdx].solicitacoes)} — ver solicitações <span className="nudge-arrow" aria-hidden="true">→</span>
              </Typography>
            )}
          </GlassPanel>

          {/* Onde focar — categorias que mais pesaram no período (Ângela).
              Com período anterior, a seção CELEBRA quando nada piorou —
              não é só um ranking, é uma leitura do que merece atenção. */}
          <SectionTitle>Ponto de atenção</SectionTitle>
          <GlassPanel className="stat-enter p-5" borderRadius={16} style={{ animationDelay: '420ms' }}>
            {m.resumoAnt != null && m.solAtual.length === 0 ? (
              <Box>
                <Typography sx={{ color: 'hsl(var(--success))', fontSize: 14, fontWeight: 700 }}>
                  🎉 Nenhuma solicitação neste período — continue assim!
                </Typography>
                {m.resumoAnt.total > 0 && (
                  <Typography sx={{ color: 'hsl(var(--text-secondary))', fontSize: 12.5, mt: 0.5 }}>
                    No período anterior houve {fmtNum.format(m.resumoAnt.total)} {m.resumoAnt.total === 1 ? 'solicitação' : 'solicitações'} — a melhora é real.
                  </Typography>
                )}
              </Box>
            ) : m.resumoAnt != null && focoLeitura.pioraram?.length === 0 ? (
              <Box>
                <Typography sx={{ color: 'hsl(var(--success))', fontSize: 14, fontWeight: 700 }}>
                  🎉 Nada piorou neste período — ótimo trabalho!
                </Typography>
                <Typography sx={{ color: 'hsl(var(--text-secondary))', fontSize: 12.5, mt: 0.5 }}>
                  {focoLeitura.melhoraram.length > 0
                    ? `Melhorou em: ${focoLeitura.melhoraram.map((c) => `"${c.cat}" (${c.antes} → ${c.atual})`).join(', ')}.`
                    : 'As solicitações ficaram estáveis em relação ao período anterior.'}
                </Typography>
              </Box>
            ) : m.solAtual.length === 0 ? (
              <Typography sx={{ color: 'hsl(var(--text-secondary))', fontSize: 13 }}>
                Sem solicitações no período.
              </Typography>
            ) : categoriasFoco.length === 0 ? (
              <Typography sx={{ color: 'hsl(var(--text-secondary))', fontSize: 13 }}>
                Nenhuma solicitação categorizada no período.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                {categoriasFoco.map((c) => {
                  const max = categoriasFoco[0]?.qtd ?? 0
                  const d = c.anterior != null ? formatarDelta(c.qtd, c.anterior) : null
                  const cor =
                    !d || d.direcao === 'flat'
                      ? 'hsl(var(--text-secondary))'
                      : d.direcao === 'up'
                        ? 'hsl(var(--error-text))'
                        : 'hsl(var(--success))'
                  return (
                    <Box key={c.cat}>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.5, mb: 0.4 }}>
                        <Typography sx={{ color: 'hsl(var(--text-primary))', fontSize: 13, fontWeight: 600 }}>
                          {c.cat}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                          <Typography sx={{ color: 'hsl(var(--text-primary))', fontSize: 13.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {fmtNum.format(c.qtd)}
                          </Typography>
                          {d && (
                            <Typography component="span" sx={{ color: cor, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {d.texto}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ height: 6, borderRadius: 4, bgcolor: 'hsl(var(--surface-2))', overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', width: `${max > 0 ? (c.qtd / max) * 100 : 0}%`, bgcolor: 'hsl(var(--accent))', borderRadius: 4 }} />
                      </Box>
                    </Box>
                  )
                })}
                {rotuloAnt && (
                  <Typography sx={{ color: 'hsl(var(--text-secondary) / 0.75)', fontSize: 11, mt: 0.5 }}>
                    Deltas comparados {rotuloAnt}
                  </Typography>
                )}
              </Box>
            )}
          </GlassPanel>

          <SectionTitle>Solicitações por cidade</SectionTitle>
          <GlassPanel className="stat-enter p-5" borderRadius={16} style={{ animationDelay: '440ms' }}>
            {/* Spinner só na primeira carga: no refetch por período a lista
                anterior fica (esmaecida) — trocar lista↔spinner a cada troca
                de chip fazia a página pular de altura. */}
            {geoLoading && !geoAtual ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CircularProgress size={16} sx={{ color: 'hsl(var(--accent))' }} />
                <Typography sx={{ color: 'hsl(var(--text-secondary))', fontSize: 13 }}>
                  Carregando cidades…
                </Typography>
              </Box>
            ) : !geoAtual ? (
              <Typography sx={{ color: 'hsl(var(--text-secondary))', fontSize: 13 }}>
                Não foi possível carregar as cidades.
              </Typography>
            ) : m.solAtual.length === 0 ? (
              <Typography sx={{ color: 'hsl(var(--text-secondary))', fontSize: 13 }}>
                Sem solicitações no período.
              </Typography>
            ) : cidades.length === 0 ? (
              <Typography sx={{ color: 'hsl(var(--text-secondary))', fontSize: 13 }}>
                Nenhuma cidade com solicitações no período.
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  opacity: geoLoading ? 0.5 : 1,
                  transition: 'opacity var(--dur-fast) var(--ease-brand)',
                }}
              >
                {cidades.map((r) => {
                  const d = r.anterior != null ? formatarDelta(r.atual, r.anterior) : null
                  const cor =
                    !d || d.direcao === 'flat'
                      ? 'hsl(var(--text-secondary))'
                      : 'hsl(var(--info-text))'
                  return (
                    <Box
                      key={r.cidade}
                      sx={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: 1.5,
                        py: 0.9,
                        borderBottom: '1px solid hsl(var(--border) / 0.5)',
                        '&:last-child': { borderBottom: 'none' },
                      }}
                    >
                      <Typography sx={{ color: 'hsl(var(--text-primary))', fontSize: 13, fontWeight: 600 }}>
                        {r.cidade}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                        <Typography sx={{ color: 'hsl(var(--text-primary))', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {fmtNum.format(r.atual)}
                        </Typography>
                        {d && (
                          <Typography component="span" sx={{ color: cor, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {d.texto}
                          </Typography>
                        )}
                        {r.anterior != null && (
                          <Typography sx={{ color: 'hsl(var(--text-secondary) / 0.7)', fontSize: 10.5, whiteSpace: 'nowrap' }}>
                            {rotuloAnt} ({fmtNum.format(r.anterior)})
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            )}
          </GlassPanel>

          {/* Últimas solicitações — adaptação de "Últimas avaliações" */}
          <SectionTitle
            action={
              <Link to="/solicitacoes" style={{ color: 'hsl(var(--accent))', fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Ver todas <span className="nudge-arrow" aria-hidden="true">→</span>
              </Link>
            }
          >
            Solicitações mais recentes
          </SectionTitle>
          {ultimas.length === 0 ? (
            <GlassPanel className="stat-enter p-5" borderRadius={16} style={{ animationDelay: '460ms' }}>
              <Typography sx={{ color: 'hsl(var(--text-secondary))', fontSize: 13 }}>
                Nenhuma solicitação registrada ainda.
              </Typography>
            </GlassPanel>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                gap: 2,
              }}
            >
              {ultimas.map((o, i) => {
                const st = (o.status || '').toLowerCase()
                const stInfo =
                  st === 'criado' ? { label: 'Sem tratativa', cor: 'hsl(var(--error-text))' }
                  : st === 'em análise' || st === 'em analise' ? { label: 'Em análise', cor: 'hsl(var(--warning))' }
                  : st === 'aprovado' ? { label: 'Aprovado', cor: 'hsl(var(--success))' }
                  : st === 'reprovado' ? { label: 'Reprovado', cor: 'hsl(var(--text-secondary))' }
                  : st === 'finalizado' ? { label: 'Finalizado', cor: 'hsl(var(--success))' }
                  : { label: o.status || '—', cor: 'hsl(var(--text-secondary))' }
                const resumo = (o.situacaoResumida || '').trim()
                return (
                  <GlassPanel key={o.id} className="stat-enter p-4" borderRadius={14} style={{ animationDelay: `${460 + i * 40}ms` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.8 }}>
                      <Box
                        component="span"
                        sx={{
                          px: 0.8,
                          py: 0.2,
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          bgcolor: colAlpha(stInfo.cor, 0.12),
                          border: `1px solid ${colAlpha(stInfo.cor, 0.3)}`,
                          color: stInfo.cor,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {stInfo.label}
                      </Box>
                      <Typography sx={{ color: 'hsl(var(--text-secondary) / 0.8)', fontSize: 10.5, ml: 'auto' }}>
                        {formatDate(o.dataCriacao)}
                      </Typography>
                    </Box>
                    <Typography sx={{ color: 'hsl(var(--text-primary))', fontSize: 13, fontWeight: 600, mb: 0.4 }}>
                      {o.categoria ? formatCategoryName(o.categoria) : 'Sem categoria'}
                    </Typography>
                    {resumo && (
                      <Typography
                        sx={{
                          color: 'hsl(var(--text-secondary))',
                          fontSize: 12,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        "{resumo.length > 140 ? resumo.slice(0, 140) + '…' : resumo}"
                      </Typography>
                    )}
                    <Typography sx={{ color: 'hsl(var(--text-secondary) / 0.7)', fontSize: 11, mt: 0.8 }}>
                      {o.tipo ? `${o.tipo} · ` : ''}{formatPhoneDisplay(o.telefone, true)}
                    </Typography>
                  </GlassPanel>
                )
              })}
            </Box>
          )}

          {/* Contexto — taxa histórica, última atividade e botão atualizar */}
          <SectionTitle>Contexto</SectionTitle>
          <GlassPanel className="stat-enter p-5" borderRadius={16} style={{ animationDelay: '500ms' }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                gap: 2.5,
              }}
            >
              <Box>
                <Typography sx={{ color: 'hsl(var(--text-secondary))', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Taxa de abertura — histórico
                </Typography>
                <Typography sx={{ color: 'hsl(var(--text-primary))', fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtTaxa(taxaHistorica.taxa)}
                </Typography>
                <Typography sx={{ color: 'hsl(var(--text-secondary) / 0.75)', fontSize: 11 }}>
                  {fmtNum.format(taxaHistorica.abriram)} de {fmtNum.format(taxaHistorica.atendidas)} pessoas atendidas abriram solicitação, desde o início
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ color: 'hsl(var(--text-secondary))', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Última solicitação
                </Typography>
                <Typography sx={{ color: 'hsl(var(--text-primary))', fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {ultimaSolicitacao ? formatRelativeTime(ultimaSolicitacao) : '—'}
                </Typography>
                {ultimaSolicitacao && (
                  <Typography sx={{ color: 'hsl(var(--text-secondary) / 0.75)', fontSize: 11 }}>
                    {ultimaSolicitacao.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })}
                  </Typography>
                )}
              </Box>
              <Box>
                <Typography sx={{ color: 'hsl(var(--text-secondary))', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Atualizado às
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography sx={{ color: 'hsl(var(--text-primary))', fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {atualizadoEm ? atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => carregar(true)}
                    disabled={atualizando}
                    startIcon={atualizando ? <CircularProgress size={12} sx={{ color: 'inherit' }} /> : <RefreshCw size={13} />}
                    sx={{
                      color: 'hsl(var(--text-secondary))',
                      borderColor: 'hsl(var(--border))',
                      textTransform: 'none',
                      borderRadius: 2,
                      fontSize: 12,
                      fontWeight: 600,
                      '&:hover': { borderColor: 'hsl(var(--accent))', color: 'hsl(var(--accent))' },
                    }}
                  >
                    {atualizando ? 'Atualizando…' : 'Atualizar'}
                  </Button>
                </Box>
              </Box>
            </Box>
          </GlassPanel>
        </>
      )}

      <Dialog
        open={!!pdfPreview}
        onClose={closePdfPreview}
        fullScreen
        PaperProps={{ sx: { bgcolor: 'hsl(var(--surface))', color: 'hsl(var(--text-primary))' } }}
      >
        <DialogTitle sx={{ color: 'hsl(var(--accent))', fontWeight: 700, fontSize: 15, py: 1, px: 2 }}>
          Relatório · Ouvidoria Jussara
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', bgcolor: 'hsl(var(--surface-2))' }}>
          {pdfPreview && (isIOS ? (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3 }}>
              <FileText size={40} color="hsl(var(--accent))" />
              <Typography sx={{ color: 'hsl(var(--text-secondary))', fontSize: 13, textAlign: 'center' }}>
                O iOS não exibe PDF aqui dentro. Abra o relatório em uma nova aba:
              </Typography>
              <Button
                variant="contained"
                component="a"
                href={pdfPreview.url}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<FileText size={16} />}
                sx={{ bgcolor: 'hsl(var(--primary))', textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: 'hsl(var(--primary-hover))' } }}
              >
                Abrir PDF
              </Button>
            </Box>
          ) : (
            <Box
              component="iframe"
              src={`${pdfPreview.url}#view=FitH`}
              title="Prévia do relatório"
              sx={{ flex: 1, border: 'none' }}
            />
          ))}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={closePdfPreview} sx={{ color: 'hsl(var(--text-secondary))', textTransform: 'none' }}>
            Fechar
          </Button>
          <Button
            variant="contained"
            component="a"
            href={pdfPreview?.url}
            download={pdfPreview?.fileName}
            startIcon={<FileDown size={16} />}
            sx={{ bgcolor: 'hsl(var(--primary))', textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: 'hsl(var(--primary-hover))' } }}
          >
            Baixar PDF
          </Button>
        </DialogActions>
      </Dialog>

      <Portal>
        <Backdrop
          open={exporting}
          sx={{
            zIndex: 1600,
            position: 'fixed',
            inset: 0,
            backdropFilter: 'blur(6px)',
            bgcolor: 'rgba(10, 12, 20, 0.5)',
            flexDirection: 'column',
            gap: 2.5,
          }}
        >
          <CircularProgress size={46} sx={{ color: 'hsl(var(--accent))' }} />
          <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
            Gerando relatório…
          </Typography>
          <Button
            size="small"
            onClick={handleCancelExport}
            sx={{ color: 'rgba(255,255,255,0.75)', textTransform: 'none', borderRadius: 2 }}
          >
            Cancelar
          </Button>
        </Backdrop>
      </Portal>
    </Box>
  )
}

export default PainelMesPage
