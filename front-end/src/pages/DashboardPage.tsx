import * as React from 'react'
import { useState, useEffect, useMemo } from 'react'
import { Typography, Box, TextField, Button, useMediaQuery, useTheme } from '@mui/material'
import { FileText, Users, TrendingUp, TrendingDown, BarChart3, Clock } from 'lucide-react'
import GlassPanel from '../components/GlassPanel'
import PageHeader from '../components/PageHeader'
import { inputSx } from '../utils/inputSx'
import { getStats } from '../services/statsService'
import { getAllOcorrencias } from '../services/reclamacaoService'
import DistributionViewer from '../components/DistributionViewer'
import PageLoader from '../components/PageLoader'
import type { Stat, Ocorrencia } from '../types'

interface TrendInfo {
  direction: 'up' | 'down' | 'neutral'
  percent: number
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
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '—'} {Math.abs(trend.percent).toFixed(0)}% vs período anterior
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
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    Promise.all([getStats(), getAllOcorrencias()])
      .then(([s, o]) => { setStats(s); setOcorrencias(o) })
      .catch(() => setError('Erro ao carregar estatísticas'))
      .finally(() => setLoading(false))
  }, [])

  const filteredOcorrencias = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null
    if (!start && !end) return ocorrencias
    return ocorrencias.filter((o) => {
      if (!o.dataCriacao) return false
      const d = new Date(o.dataCriacao)
      if (isNaN(d.getTime())) return false
      if (start && d < start) return false
      if (end && d > end) return false
      return true
    })
  }, [ocorrencias, startDate, endDate])

  const computedStats = useMemo<Stat | null>(() => {
    if (!stats) return null
    const hasFilter = Boolean(startDate || endDate)
    if (!hasFilter) return stats

    const totalReclamacoes = filteredOcorrencias.length
    const totalIndicacoes = filteredOcorrencias.filter((o) => o.tipo === 'indicacao').length
    const totalRequerimentos = filteredOcorrencias.filter((o) => o.tipo === 'requerimento').length
    const percIndicacao = totalReclamacoes > 0 ? (totalIndicacoes / totalReclamacoes) * 100 : 0
    const percRequerimento = totalReclamacoes > 0 ? (totalRequerimentos / totalReclamacoes) * 100 : 0
    const numPessoas = new Set(filteredOcorrencias.map((o) => o.telefone)).size

    const regiaoMap: Record<string, number> = {}
    for (const o of filteredOcorrencias) {
      const regiao = o.detalhes?.regiao || 'Sem Região Definida'
      regiaoMap[regiao] = (regiaoMap[regiao] || 0) + 1
    }
    const regioes = Object.entries(regiaoMap).map(([regiao, qtdRegiao]) => ({ regiao, qtdRegiao }))

    const categoriaMap: Record<string, number> = {}
    for (const o of filteredOcorrencias) {
      const cat = o.categoria || 'Sem Categoria'
      categoriaMap[cat] = (categoriaMap[cat] || 0) + 1
    }
    const categorias = Object.entries(categoriaMap).map(([categoria, qtdCategoria]) => ({ categoria, qtdCategoria }))

    return {
      ...stats,
      numReclamacoes: totalReclamacoes,
      totalIndicacoes,
      totalRequerimentos,
      percIndicacao,
      percRequerimento,
      numPessoas,
      regioes,
      categorias,
      indicacoesAprovadas: totalIndicacoes,
      requerimentosAprovados: totalRequerimentos,
    }
  }, [stats, filteredOcorrencias, startDate, endDate])

  const tempoMedioResolucao = useMemo(() => {
    const resolvidas = filteredOcorrencias.filter((o) => o.status === 'aprovado' || o.status === 'reprovado')
    if (resolvidas.length === 0) return null
    const totalDays = resolvidas.reduce((sum, o) => {
      const criacao = new Date(o.dataCriacao)
      const atualizacao = new Date(o.dataAtualizacao)
      if (isNaN(criacao.getTime()) || isNaN(atualizacao.getTime())) return sum
      return sum + (atualizacao.getTime() - criacao.getTime()) / (1000 * 60 * 60 * 24)
    }, 0)
    const avgDays = totalDays / resolvidas.length
    if (avgDays < 1) return `${Math.round(avgDays * 24)}h`
    if (avgDays < 30) return `${avgDays.toFixed(1)} dias`
    return `${(avgDays / 30).toFixed(1)} meses`
  }, [filteredOcorrencias])

  const trends = useMemo<{ reclamacoes: TrendInfo | null; indicacoes: TrendInfo | null; requerimentos: TrendInfo | null; pessoas: TrendInfo | null }>(() => {
    const hasFilter = Boolean(startDate && endDate)
    if (!hasFilter) return { reclamacoes: null, indicacoes: null, requerimentos: null, pessoas: null }

    const start = new Date(`${startDate}T00:00:00`)
    const end = new Date(`${endDate}T23:59:59`)
    const durationMs = end.getTime() - start.getTime()
    const prevEnd = new Date(start.getTime() - 1)
    const prevStart = new Date(prevEnd.getTime() - durationMs)

    const prevOcorrencias = ocorrencias.filter((o) => {
      if (!o.dataCriacao) return false
      const d = new Date(o.dataCriacao)
      if (isNaN(d.getTime())) return false
      return d >= prevStart && d <= prevEnd
    })

    const calcTrend = (current: number, previous: number): TrendInfo => {
      if (previous === 0) return { direction: current > 0 ? 'up' : 'neutral', percent: current > 0 ? 100 : 0 }
      const pct = ((current - previous) / previous) * 100
      if (Math.abs(pct) < 1) return { direction: 'neutral', percent: 0 }
      return { direction: pct > 0 ? 'up' : 'down', percent: Math.abs(pct) }
    }

    const currReclamacoes = filteredOcorrencias.length
    const currIndicacoes = filteredOcorrencias.filter((o) => o.tipo === 'indicacao').length
    const currRequerimentos = filteredOcorrencias.filter((o) => o.tipo === 'requerimento').length
    const currPessoas = new Set(filteredOcorrencias.map((o) => o.telefone)).size

    const prevReclamacoes = prevOcorrencias.length
    const prevIndicacoes = prevOcorrencias.filter((o) => o.tipo === 'indicacao').length
    const prevRequerimentos = prevOcorrencias.filter((o) => o.tipo === 'requerimento').length
    const prevPessoas = new Set(prevOcorrencias.map((o) => o.telefone)).size

    return {
      reclamacoes: calcTrend(currReclamacoes, prevReclamacoes),
      indicacoes: calcTrend(currIndicacoes, prevIndicacoes),
      requerimentos: calcTrend(currRequerimentos, prevRequerimentos),
      pessoas: calcTrend(currPessoas, prevPessoas),
    }
  }, [filteredOcorrencias, ocorrencias, startDate, endDate])

  const kanbanData = (() => {
    const counts: Record<string, number> = {
      'Reclamações Pendentes': 0,
      'Em Análise': 0,
      'Aprovados como Indicação': 0,
      'Aprovados como Requerimento': 0,
      'Reprovados': 0,
    }
    for (const o of filteredOcorrencias) {
      const status = o.status.toLowerCase()
      if (status === 'criado') counts['Reclamações Pendentes']++
      else if (status === 'em análise' || status === 'em analise') counts['Em Análise']++
      else if (status === 'aprovado' && o.tipo === 'indicacao') counts['Aprovados como Indicação']++
      else if (status === 'aprovado' && o.tipo === 'requerimento') counts['Aprovados como Requerimento']++
      else if (status === 'reprovado') counts['Reprovados']++
    }
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
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
          inputProps={{ style: { textAlign: isMobile ? 'center' : 'left' }, autoComplete: 'off' }}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          sx={{ ...inputSx, minWidth: 150 }}
        />
        <TextField
          type="date"
          size="small"
          label="Até"
          InputLabelProps={{ shrink: true }}
          inputProps={{ style: { textAlign: isMobile ? 'center' : 'left' }, autoComplete: 'off' }}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
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
      <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2.5, alignItems: 'stretch' }}>
        {/* Coluna 1 — Indicações */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <StatCard sx={{ flex: 1 }} label="Total de Indicações" value={computedStats?.totalIndicacoes ?? 0} icon={BarChart3} color="#66BB80" trend={trends.indicacoes} />
          <StatCard sx={{ flex: 1 }} label="Taxa de Conversão Indicações" value={`${(computedStats?.percIndicacao ?? 0).toFixed(1)}%`} icon={TrendingUp} color="#66BB80" subtitle="Percentual de reclamações classificadas como indicação em relação ao total de reclamações" />
        </Box>

        {/* Coluna 2 — Requerimentos */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <StatCard sx={{ flex: 1 }} label="Total de Requerimentos" value={computedStats?.totalRequerimentos ?? 0} icon={FileText} color="#E89E70" trend={trends.requerimentos} />
          <StatCard sx={{ flex: 1 }} label="Taxa de Conversão Requerimentos" value={`${(computedStats?.percRequerimento ?? 0).toFixed(1)}%`} icon={TrendingUp} color="#E89E70" subtitle="Percentual de reclamações classificadas como requerimento em relação ao total de reclamações" />
        </Box>

        {/* Coluna 3 — Gerais (3 cards, crescem para igualar altura) */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <StatCard sx={{ flex: 1 }} label="Total de Reclamações" value={computedStats?.numReclamacoes ?? 0} icon={FileText} color="#41669C" trend={trends.reclamacoes} />
          <StatCard sx={{ flex: 1 }} label="Total de Pessoas Atendidas" value={computedStats?.numPessoas ?? 0} icon={Users} color="#62A1D8" trend={trends.pessoas} />
          <StatCard sx={{ flex: 1 }} label="Tempo Médio de Resolução" value={tempoMedioResolucao ?? '-'} icon={Clock} color="#A1A9B8" subtitle="Tempo médio entre criação e resolução (aprovação/reprovação)" />
        </Box>
      </Box>

      {computedStats && (
        <Box mt={4}>
          <DistributionViewer stats={computedStats} kanbanData={kanbanData} />
        </Box>
      )}
    </Box>
  )
}

export default DashboardPage
