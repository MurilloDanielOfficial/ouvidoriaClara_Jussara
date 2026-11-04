import * as React from 'react'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Typography, Box, TextField, Button, useMediaQuery, useTheme } from '@mui/material'
import { FileText, Users, TrendingUp, TrendingDown, BarChart3, XCircle, Inbox, Heart, UserCheck } from 'lucide-react'
import GlassPanel from '../components/GlassPanel'
import PageHeader from '../components/PageHeader'
import { inputSx } from '../utils/inputSx'
import { getStats } from '../services/statsService'
import { getAllOcorrencias } from '../services/reclamacaoService'
import { getAllContatosUnificados } from '../services/contatoUnificadoService'
import { listConversas } from '../services/difyService'
import { computeChatPhones } from '../utils/exportRelatorioPdf'
import { toUTCDate } from '../utils/date'
import DistributionViewer from '../components/DistributionViewer'
import PageLoader from '../components/PageLoader'
import type { Stat, Ocorrencia, ConversaResumo } from '../types'

interface TrendInfo {
  direction: 'up' | 'down' | 'neutral'
  percent: number
  prevLabel: string
}

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ElementType
  color?: string
  subtitle?: string
  trend?: TrendInfo | null
  sx?: React.CSSProperties
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color = 'hsl(var(--accent))', subtitle, trend, sx }) => (
  <GlassPanel
    className="p-5 flex flex-col gap-3"
    borderRadius={14}
    style={{ transition: 'transform 0.2s ease, box-shadow 0.2s ease', cursor: 'default', ...sx }}
  >
    <Box display="flex" alignItems="center" justifyContent="space-between">
      <Box>
        <Typography variant="body2" sx={{ color: 'hsl(var(--text-secondary))', fontWeight: 500, fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {label}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: 'hsl(var(--text-secondary) / 0.6)', fontSize: 10, display: 'block', mt: 0.3 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <Box sx={{ width: 36, height: 36, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}1a` }}>
        <Icon size={18} style={{ color }} />
      </Box>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
      <Typography variant="h4" sx={{ color: 'hsl(var(--text-primary))', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </Typography>
      {trend && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
          {trend.direction === 'up' ? (
            <TrendingUp size={16} color="#66BB80" />
          ) : trend.direction === 'down' ? (
            <TrendingDown size={16} color="#D16670" />
          ) : null}
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: trend.direction === 'up' ? '#66BB80' : trend.direction === 'down' ? '#D16670' : 'hsl(var(--text-secondary))' }}>
            {Math.abs(trend.percent).toFixed(0)}% comparado a {trend.prevLabel}
          </Typography>
        </Box>
      )}
    </Box>
    <Box sx={{ height: 3, borderRadius: 2, background: `${color}` }} />
  </GlassPanel>
)

const DashboardPage: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [stats, setStats] = useState<Stat | null>(null)
  const [prevStats, setPrevStats] = useState<Stat | null>(null)
  const [contatosAtivos, setContatosAtivos] = useState<number | null>(null)
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [conversas, setConversas] = useState<ConversaResumo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Carga inicial: stats sem filtro + todas as ocorrências (para Kanban cards e
  // DistributionViewer) + conversas (para "Pessoas Atendidas" = total de
  // conversas). /chat falhando não derruba a página — o card fica em 0.
  useEffect(() => {
    Promise.all([
      getStats(),
      getAllOcorrencias(undefined, 0, 0),
      listConversas().catch(() => [] as ConversaResumo[]),
    ])
      .then(([s, o, cv]) => {
        setStats(s)
        setOcorrencias(o.ocorrencias || [])
        setConversas(cv)
      })
      .catch(() => setError('Erro ao carregar estatísticas'))
      .finally(() => setLoading(false))
    // Total de contatos ativos (mesmo número da aba Contatos) — snapshot atual,
    // não responde ao filtro de datas.
    getAllContatosUnificados(1, 0, { leadAtivo: true })
      .then((d) => setContatosAtivos(d.total))
      .catch(() => {})
  }, [])

  // Quando as datas mudam: buscar stats filtradas do servidor (rápido)
  // + stats do período anterior para trends
  const fetchFilteredStats = useCallback(async (inicio: string, fim: string) => {
    try {
      const [curr, prev] = await Promise.all([
        getStats(inicio, fim),
        (async () => {
          const start = new Date(`${inicio}T00:00:00`)
          const end = new Date(`${fim}T23:59:59`)
          const durationMs = end.getTime() - start.getTime()
          const prevEnd = new Date(start.getTime() - 1)
          const prevStart = new Date(prevEnd.getTime() - durationMs)
          const prevInicio = prevStart.toISOString().slice(0, 10)
          const prevFim = prevEnd.toISOString().slice(0, 10)
          return getStats(prevInicio, prevFim)
        })(),
      ])
      setStats(curr)
      setPrevStats(prev)
    } catch {
      // mantém stats anteriores se falhar
    }
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      fetchFilteredStats(startDate, endDate)
    } else if (startDate || endDate) {
      // Filtro parcial (só "De" ou só "Até"): /stats aceita os params independentemente
      getStats(startDate || undefined, endDate || undefined).then(setStats).catch(() => {})
      setPrevStats(null)
    } else {
      // Sem filtro: recarregar stats sem filtro
      getStats().then(setStats).catch(() => {})
      setPrevStats(null)
    }
  }, [startDate, endDate, fetchFilteredStats])

  const dateRange = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null
    return { start, end }
  }, [startDate, endDate])

  const filteredOcorrencias = useMemo(() => {
    if (!dateRange.start && !dateRange.end) return ocorrencias
    return ocorrencias.filter((o) => {
      if (!o.dataCriacao) return false
      const d = toUTCDate(o.dataCriacao)
      if (isNaN(d.getTime())) return false
      if (dateRange.start && d < dateRange.start) return false
      if (dateRange.end && d > dateRange.end) return false
      return true
    })
  }, [ocorrencias, dateRange])

  // Stats do servidor já vêm filtrados por data; usar diretamente
  const computedStats = stats

  // Pessoas Atendidas = total de conversas (quem falou com a IA) — mesmo
  // critério do relatório PDF. stats.numPessoas conta a tabela contatos,
  // que inclui Lideranças/cadastros que nunca falaram com a Ju.
  const pessoasAtendidas = useMemo(
    () => computeChatPhones(conversas, startDate || undefined, endDate || undefined).size,
    [conversas, startDate, endDate]
  )

  const trends = useMemo<{ reclamacoes: TrendInfo | null; indicacoes: TrendInfo | null; requerimentos: TrendInfo | null; pessoas: TrendInfo | null; reprovadas: TrendInfo | null }>(() => {
    if (!prevStats || !startDate || !endDate) {
      return { reclamacoes: null, indicacoes: null, requerimentos: null, pessoas: null, reprovadas: null }
    }

    const start = new Date(`${startDate}T00:00:00`)
    const end = new Date(`${endDate}T23:59:59`)
    const durationMs = end.getTime() - start.getTime()
    const prevEnd = new Date(start.getTime() - 1)
    const prevStart = new Date(prevEnd.getTime() - durationMs)

    const fmtShort = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', timeZone: 'UTC' })
    const prevLabel = `${fmtShort(prevStart)}–${fmtShort(prevEnd)}`

    const calcTrend = (current: number, previous: number): TrendInfo => {
      if (previous === 0) return { direction: current > 0 ? 'up' : 'neutral', percent: current > 0 ? 100 : 0, prevLabel }
      const pct = ((current - previous) / previous) * 100
      if (Math.abs(pct) < 1) return { direction: 'neutral', percent: 0, prevLabel }
      return { direction: pct > 0 ? 'up' : 'down', percent: Math.abs(pct), prevLabel }
    }

    const currReclamacoes = stats?.numReclamacoes ?? 0
    const currIndicacoes = stats?.totalIndicacoes ?? 0
    const currRequerimentos = stats?.totalRequerimentos ?? 0

    const prevReclamacoes = prevStats.numReclamacoes ?? 0
    const prevIndicacoes = prevStats.totalIndicacoes ?? 0
    const prevRequerimentos = prevStats.totalRequerimentos ?? 0
    // Trend de pessoas compara conversas do período anterior — consistente
    // com o card, que conta o total de conversas e não numPessoas.
    const prevPessoas = computeChatPhones(
      conversas,
      prevStart.toISOString().slice(0, 10),
      prevEnd.toISOString().slice(0, 10),
    ).size

    return {
      reclamacoes: calcTrend(currReclamacoes, prevReclamacoes),
      indicacoes: calcTrend(currIndicacoes, prevIndicacoes),
      requerimentos: calcTrend(currRequerimentos, prevRequerimentos),
      pessoas: calcTrend(pessoasAtendidas, prevPessoas),
      reprovadas: null, // back-end não retorna reprovados por período no /stats
    }
  }, [stats, prevStats, startDate, endDate, conversas, pessoasAtendidas])

  const kanbanData = (() => {
    const counts: Record<string, number> = {
      'Sem Tratativa': 0,
      'Em Análise': 0,
      'Concluído como Requerimento': 0,
      'Concluído como Indicação': 0,
      'Concluído como Causa Animal': 0,
      'Concluído (Outros)': 0,
      'Desqualificado': 0,
    }
    for (const o of filteredOcorrencias) {
      const status = o.status.toLowerCase()
      if (status === 'criado') counts['Sem Tratativa']++
      else if (status === 'em análise' || status === 'em analise') counts['Em Análise']++
      else if (status === 'aprovado' && o.tipo === 'requerimento') counts['Concluído como Requerimento']++
      else if (status === 'aprovado' && o.tipo === 'indicacao') counts['Concluído como Indicação']++
      else if (status === 'aprovado' && o.tipo === 'causa animal') counts['Concluído como Causa Animal']++
      else if (status === 'aprovado' && o.tipo === 'outros') counts['Concluído (Outros)']++
      else if (status === 'reprovado') counts['Desqualificado']++
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  })()

  if (loading) {
    return <PageLoader message="Carregando estatísticas..." />
  }

  if (error) {
    return (
      <Box className="page-root"><Typography color="error">{error}</Typography></Box>
    )
  }

  return (
    <Box className="page-root">
      <PageHeader title="Estatísticas" />
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 1.5,
          mb: 3,
          alignItems: 'center',
          p: 2,
          borderRadius: 2,
          bgcolor: 'hsl(var(--surface-2))',
          border: '1px solid hsl(var(--border))',
        }}
      >
        <TextField
          type="date"
          size="small"
          label="De"
          InputLabelProps={{ shrink: true }}
          inputProps={{ style: { textAlign: isMobile ? 'center' : 'left' }, autoComplete: 'off', max: endDate || undefined }}
          value={startDate}
          onChange={(e) => { const v = e.target.value; setStartDate(v && endDate && v > endDate ? endDate : v) }}
          sx={{ ...inputSx, minWidth: 150 }}
        />
        <TextField
          type="date"
          size="small"
          label="Até"
          InputLabelProps={{ shrink: true }}
          inputProps={{ style: { textAlign: isMobile ? 'center' : 'left' }, autoComplete: 'off', min: startDate || undefined }}
          value={endDate}
          onChange={(e) => { const v = e.target.value; setEndDate(v && startDate && v < startDate ? startDate : v) }}
          sx={{ ...inputSx, minWidth: 150 }}
        />
        <Button
          size="small"
          onClick={() => { setStartDate(''); setEndDate('') }}
          sx={{ color: 'hsl(var(--text-secondary))', textTransform: 'none', borderRadius: 2, width: isMobile ? '100%' : undefined }}
        >
          Limpar Filtros
        </Button>
      </Box>
      {/* Cards por coluna do Kanban (7 colunas, agrupados em 3 colunas visuais) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 2, mb: 2.5, alignItems: 'stretch' }}>
        {/* Coluna 1 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <StatCard sx={{ flex: 1 }} label="Sem Tratativa" value={filteredOcorrencias.filter((o) => o.status.toLowerCase() === 'criado').length} icon={Inbox} color="#A1A9B8" />
          <StatCard sx={{ flex: 1 }} label="Em Análise" value={filteredOcorrencias.filter((o) => o.status.toLowerCase() === 'em análise' || o.status.toLowerCase() === 'em analise').length} icon={BarChart3} color="#62A1D8" />
        </Box>

        {/* Coluna 2 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <StatCard sx={{ flex: 1 }} label="Concluído como Requerimento" value={filteredOcorrencias.filter((o) => o.status.toLowerCase() === 'aprovado' && o.tipo === 'requerimento').length} icon={FileText} color="#E89E70" />
          <StatCard sx={{ flex: 1 }} label="Concluído como Indicação" value={filteredOcorrencias.filter((o) => o.status.toLowerCase() === 'aprovado' && o.tipo === 'indicacao').length} icon={TrendingUp} color="#66BB80" />
          <StatCard sx={{ flex: 1 }} label="Concluído como Causa Animal" value={filteredOcorrencias.filter((o) => o.status.toLowerCase() === 'aprovado' && o.tipo === 'causa animal').length} icon={Heart} color="#B98CE8" />
        </Box>

        {/* Coluna 3 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <StatCard sx={{ flex: 1 }} label="Concluído (Outros)" value={filteredOcorrencias.filter((o) => o.status.toLowerCase() === 'aprovado' && o.tipo === 'outros').length} icon={FileText} color="#5B8FE0" />
          <StatCard sx={{ flex: 1 }} label="Desqualificado" value={filteredOcorrencias.filter((o) => o.status.toLowerCase() === 'reprovado').length} icon={XCircle} color="#D16670" />
        </Box>
      </Box>

      {/* Cards gerais */}
      <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2.5, alignItems: 'stretch', mb: 2.5 }}>
        <StatCard sx={{ flex: 1 }} label="Total de Solicitações" value={computedStats?.numReclamacoes ?? 0} icon={FileText} color="#41669C" trend={trends.reclamacoes} />
        <StatCard sx={{ flex: 1 }} label="Total de Pessoas Atendidas" value={pessoasAtendidas} icon={Users} color="#62A1D8" trend={trends.pessoas} />
        <StatCard sx={{ flex: 1 }} label="Total de Contatos" value={contatosAtivos ?? '—'} icon={UserCheck} color="#E2AF7A" />
      </Box>

      {computedStats && (
        <Box mt={4}>
          <DistributionViewer
            stats={computedStats}
            kanbanData={kanbanData}
            ocorrencias={filteredOcorrencias}
            dateStart={startDate}
            dateEnd={endDate}
          />
        </Box>
      )}
    </Box>
  )
}

export default DashboardPage
