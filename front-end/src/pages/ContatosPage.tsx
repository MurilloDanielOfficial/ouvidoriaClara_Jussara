import * as React from 'react'
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Chip, Alert, useMediaQuery, useTheme, Select, MenuItem, Autocomplete,
} from '@mui/material'
import {
  Snowflake, Users, FileText,
} from 'lucide-react'
import GlassPanel from '../components/GlassPanel'
import PageHeader from '../components/PageHeader'
import PageLoader from '../components/PageLoader'
import ConfirmDialog from '../components/ConfirmDialog'
import { inputSx, dialogSx } from '../utils/inputSx'
import {
  getAllContatosUnificados,
  ligarRobo, desligarRobo, createCliente, updateCliente, deleteCliente,
} from '../services/contatoUnificadoService'
import { formatPhoneDisplay } from '../utils/phone'
import { formatDate } from '../utils/date'
import { getDadosCliente } from '../services/clienteService'
import { getAllOcorrencias } from '../services/reclamacaoService'
import { getAllEnderecos } from '../services/enderecoService'
import { categoryDisplayName } from '../utils/categories'
import type { ContatoUnificado, Cliente, Ocorrencia, DetalhesReclamacao, Logradouro } from '../types'

const ITEMS_PER_PAGE = 12

const chipSx = (active: boolean) => ({
  borderRadius: '20px',
  fontSize: 12,
  fontWeight: active ? 600 : 500,
  bgcolor: active ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--surface-2))',
  color: active ? 'hsl(var(--accent))' : 'hsl(var(--text-secondary))',
  border: active ? '1px solid hsl(var(--primary) / 0.4)' : '1px solid hsl(var(--border))',
  cursor: 'pointer',
  transition: 'all 0.18s ease',
  '&:hover': { bgcolor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--accent))' },
})

type FilterState = Record<'darwin' | 'contact' | 'gelo' | 'reclamacao', boolean | null>

const ContatosPage: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [contatos, setContatos] = useState<ContatoUnificado[]>([])
  const [summary, setSummary] = useState({ total: 0, usados: 0, ocupacao: '0/0', limite: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<FilterState>({ darwin: null, contact: null, gelo: null, reclamacao: null })
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState('')
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing] = useState<ContatoUnificado | null>(null)
  const [form, setForm] = useState<Cliente>({ telefone: '', nome: '', cidade: '', endereco: '', bairro: '', dataNascimento: '', dataCriacao: '' })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toDelete, setToDelete] = useState<ContatoUnificado | null>(null)
  const [ocorrenciaDialogOpen, setOcorrenciaDialogOpen] = useState(false)
  const [ocorrenciaList, setOcorrenciaList] = useState<Ocorrencia[]>([])
  const [ocorrenciaLoading, setOcorrenciaLoading] = useState(false)
  const [ocorrenciaContact, setOcorrenciaContact] = useState<ContatoUnificado | null>(null)
  const [ocFiltroStatus, setOcFiltroStatus] = useState('')
  const [ocFiltroTipo, setOcFiltroTipo] = useState('')
  const [ocFiltroCategoria, setOcFiltroCategoria] = useState('')
  const [ocFiltroInicio, setOcFiltroInicio] = useState('')
  const [ocFiltroFim, setOcFiltroFim] = useState('')
  const [lightboxImg, setLightboxImg] = useState<string | null>(null)
  const [lightboxIsVideo, setLightboxIsVideo] = useState(false)
  const [enderecos, setEnderecos] = useState<Logradouro[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, ocorrencias] = await Promise.all([getAllContatosUnificados(), getAllOcorrencias()])
      const reclamacoesPhones = new Set<string>()
      ocorrencias.forEach((o) => reclamacoesPhones.add(o.telefone))
      const contatosWithFlag = data.contatos.map((c) => ({
        ...c,
        hasReclamacao: reclamacoesPhones.has(c.telefone),
      }))
      setContatos(contatosWithFlag)
      setSummary({ total: data.total, usados: data.usados, ocupacao: data.ocupacao, limite: data.limite })
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar contatos')
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshSummary = useCallback(async () => {
    try {
      const data = await getAllContatosUnificados()
      setSummary({ total: data.total, usados: data.usados, ocupacao: data.ocupacao, limite: data.limite })
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null
    const term = search.trim().toLowerCase()
    const digits = search.replace(/\D/g, '')
    return contatos.filter((c) => {
      if (term) {
        const matchName = c.nome.toLowerCase().includes(term)
        const matchPhone = digits.length > 0 && c.telefone.includes(digits)
        if (!matchName && !matchPhone) return false
      }
      if (filters.darwin !== null && c.darwinAtivo !== filters.darwin) return false
      if (filters.contact !== null && c.leadAtivo !== filters.contact) return false
      if (filters.gelo !== null && c.isGelado !== filters.gelo) return false
      if (filters.reclamacao !== null && c.hasReclamacao !== filters.reclamacao) return false
      if (start || end) {
        if (!c.dataCriacao) return false
        const d = new Date(c.dataCriacao)
        if (isNaN(d.getTime())) return false
        if (start && d < start) return false
        if (end && d > end) return false
      }
      return true
    })
  }, [contatos, search, filters, startDate, endDate])

  useEffect(() => { setCurrentPage(1) }, [filters, search, startDate, endDate])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  const resetFilters = () => {
    setFilters({ darwin: null, contact: null, gelo: null, reclamacao: null })
    setStartDate('')
    setEndDate('')
    setSearch('')
  }

  const handleToggleDarwin = async (c: ContatoUnificado, targetState: boolean) => {
    if (c.darwinAtivo === targetState) return
    setActionLoading((p) => ({ ...p, [c.telefone]: true }))
    try {
      if (targetState) await ligarRobo(c.telefone)
      else await desligarRobo(c.telefone)
      setContatos((prev) => prev.map((p) => p.telefone === c.telefone ? { ...p, darwinAtivo: targetState } : p))
      refreshSummary()
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar status da Darwin IA')
    } finally {
      setActionLoading((p) => { const n = { ...p }; delete n[c.telefone]; return n })
    }
  }

  const handleTelefoneBlur = async () => {
    if (editing) return
    const tel = form.telefone.replace(/\D/g, '')
    if (tel.length < 10) return
    try {
      const dados = await getDadosCliente(tel)
      if (dados?.nome && !form.nome) {
        setForm((prev) => ({ ...prev, nome: dados.nome }))
      }
    } catch { /* ignore */ }
  }

  const openEdit = (c: ContatoUnificado) => {
    setEditing(c)
    setForm({
      telefone: c.telefone, nome: c.nome, cidade: c.cidade || '',
      endereco: c.endereco || '', bairro: c.bairro || '',
      dataNascimento: c.dataNascimento || '', dataCriacao: c.dataCriacao || '',
    })
    setOpenModal(true)
    getAllEnderecos().then(setEnderecos).catch(() => setEnderecos([]))
  }

  const save = async () => {
    try {
      const payload = { ...form }
      if (!payload.dataNascimento) delete (payload as any).dataNascimento
      if (!payload.dataCriacao) delete (payload as any).dataCriacao
      if (editing) await updateCliente(editing.telefone, payload)
      else await createCliente(payload)
      setOpenModal(false)
      load()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar cliente')
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteCliente(toDelete.telefone)
      setConfirmOpen(false)
      load()
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir cliente')
    }
  }

  const getColumnId = (o: Ocorrencia): string => {
    if (o.status === 'reprovado') return 'reprovar'
    if (o.status === 'aprovado') {
      if (o.tipo === 'requerimento') return 'aprovar-requerimento'
      return 'aprovar-indicacao'
    }
    if (o.status === 'em análise') return 'em-analise'
    return 'pendentes'
  }

  const columnLabels: Record<string, string> = {
    'pendentes': 'Reclamações Pendentes',
    'em-analise': 'Em Análise',
    'aprovar-indicacao': 'Aprovado como Indicação',
    'aprovar-requerimento': 'Aprovado como Requerimento',
    'reprovar': 'Reprovado',
  }

  const columnColors: Record<string, string> = {
    'pendentes': '#A1A9B8',
    'em-analise': '#62A1D8',
    'aprovar-indicacao': '#66BB80',
    'aprovar-requerimento': '#E89E70',
    'reprovar': '#D16670',
  }

  const handleVerOcorrencias = async (c: ContatoUnificado) => {
    setOcorrenciaContact(c)
    setOcorrenciaDialogOpen(true)
    setOcorrenciaLoading(true)
    setOcorrenciaList([])
    setOcFiltroStatus('')
    setOcFiltroTipo('')
    setOcFiltroCategoria('')
    setOcFiltroInicio('')
    setOcFiltroFim('')
    try {
      const tel = c.telefone.replace(/\D/g, '')
      const data = await getAllOcorrencias(tel)
      setOcorrenciaList(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Erro ao carregar ocorrências:', err)
      setOcorrenciaList([])
    } finally {
      setOcorrenciaLoading(false)
    }
  }

  const ocorrenciaFiltrada = useMemo(() => {
    if (!Array.isArray(ocorrenciaList)) return []
    return ocorrenciaList.filter((o) => {
      if (ocFiltroStatus && getColumnId(o) !== ocFiltroStatus) return false
      if (ocFiltroTipo && o.tipo !== ocFiltroTipo) return false
      if (ocFiltroCategoria && o.categoria !== ocFiltroCategoria) return false
      if (ocFiltroInicio || ocFiltroFim) {
        if (!o.dataCriacao) return false
        const d = new Date(o.dataCriacao)
        if (isNaN(d.getTime())) return false
        if (ocFiltroInicio) {
          const start = new Date(`${ocFiltroInicio}T00:00:00`)
          if (d < start) return false
        }
        if (ocFiltroFim) {
          const end = new Date(`${ocFiltroFim}T23:59:59`)
          if (d > end) return false
        }
      }
      return true
    })
  }, [ocorrenciaList, ocFiltroStatus, ocFiltroTipo, ocFiltroCategoria, ocFiltroInicio, ocFiltroFim])

  const detalhesArr = (d: DetalhesReclamacao): { label: string; value: string }[] => {
    const arr: { label: string; value: string }[] = []
    if (d.enderecoOcorrencia) arr.push({ label: 'End. Ocorrência', value: d.enderecoOcorrencia })
    if (d.conheceTutor) arr.push({ label: 'Conhece Tutor', value: d.conheceTutor })
    if (d.condicoesAnimal) arr.push({ label: 'Condições', value: d.condicoesAnimal })
    if (d.frequenciaMausTratos) arr.push({ label: 'Frequência', value: d.frequenciaMausTratos })
    if (d.nomeAnimal) arr.push({ label: 'Animal', value: d.nomeAnimal })
    if (d.especieAnimal) arr.push({ label: 'Espécie', value: d.especieAnimal })
    if (d.idadeAnimal) arr.push({ label: 'Idade', value: d.idadeAnimal })
    if (d.sexoAnimal) arr.push({ label: 'Sexo', value: d.sexoAnimal })
    if (d.bairroAnimal) arr.push({ label: 'Bairro', value: d.bairroAnimal })
    if (d.nomeResponsavelAnimal) arr.push({ label: 'Responsável', value: d.nomeResponsavelAnimal })
    if (d.telefoneResponsavelAnimal) arr.push({ label: 'Tel. Resp.', value: d.telefoneResponsavelAnimal })
    if (d.historicoAnimal) arr.push({ label: 'Histórico', value: d.historicoAnimal })
    if (d.temCadUnico) arr.push({ label: 'CadÚnico', value: d.temCadUnico })
    if (d.ehProtetorIndependente) arr.push({ label: 'Protetor', value: d.ehProtetorIndependente })
    if (d.situacaoAnimal) arr.push({ label: 'Situação', value: d.situacaoAnimal })
    if (d.quandoCruzou) arr.push({ label: 'Cruzou em', value: d.quandoCruzou })
    if (d.infoSaudeAnimal) arr.push({ label: 'Saúde', value: d.infoSaudeAnimal })
    if (d.detalhesDenuncia) arr.push({ label: 'Denúncia', value: d.detalhesDenuncia })
    if (d.tempoAnimalLocal) arr.push({ label: 'Tempo local', value: d.tempoAnimalLocal })
    if (d.ferimentosAnimal) arr.push({ label: 'Ferimentos', value: d.ferimentosAnimal })
    if (d.providenciasAnimal) arr.push({ label: 'Providências', value: d.providenciasAnimal })
    if (d.protocoloDenuncia) arr.push({ label: 'Protocolo', value: d.protocoloDenuncia })
    if (d.regiao) arr.push({ label: 'Região', value: d.regiao })
    return arr
  }

  return (
    <Box className="page-root">
      <PageHeader title="Contatos" />

      {/* filter: date range */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 1.5,
          mb: 2,
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
          inputProps={{ style: { textAlign: isMobile ? 'center' : 'left' } }}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          sx={{ ...inputSx, minWidth: 150 }}
        />
        <TextField
          type="date"
          size="small"
          label="Até"
          InputLabelProps={{ shrink: true }}
          inputProps={{ style: { textAlign: isMobile ? 'center' : 'left' } }}
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

      {/* filter: search by name or phone */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 1.5,
          mb: 2,
          alignItems: 'center',
          p: 2,
          borderRadius: 2,
          bgcolor: 'hsl(var(--surface-2))',
          border: '1px solid hsl(var(--border))',
        }}
      >
        <TextField
          label="Buscar nome ou telefone"
          size="small"
          inputProps={{ style: { textAlign: isMobile ? 'center' : 'left' } }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ ...inputSx, minWidth: 220 }}
        />
        <Button
          size="small"
          onClick={() => setSearch('')}
          sx={{ color: 'hsl(var(--text-secondary))', textTransform: 'none', borderRadius: 2, width: isMobile ? '100%' : undefined }}
        >
          Limpar Filtros
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, minmax(180px, 1fr))' }, gap: 2, mb: 3, p: 2.5, borderRadius: 3, bgcolor: 'hsl(var(--surface-2))', border: '1px solid hsl(var(--border))' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <Button onClick={resetFilters} sx={{ width: 'clamp(140px, 100%, 200px)', textTransform: 'none', fontWeight: 700, borderRadius: 2, py: 1, color: '#fff', background: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary) / 0.35)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', '&:hover': { background: 'hsl(var(--primary) / 0.85)' } }}>Todos</Button>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>Status Darwin</Typography>
          <Button fullWidth variant="outlined" onClick={() => setFilters((p) => ({ ...p, darwin: p.darwin === true ? null : true }))} sx={{ justifyContent: 'flex-start', textTransform: 'none', borderRadius: 2, py: 0.75, fontSize: 13, fontWeight: 600, ...(filters.darwin === true ? { background: 'hsl(var(--primary) / 0.15)', borderColor: 'hsl(var(--primary) / 0.5)', color: 'hsl(var(--accent))', boxShadow: 'none' } : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-secondary))' }) }}>Darwin Ativo</Button>
          <Button fullWidth variant="outlined" onClick={() => setFilters((p) => ({ ...p, darwin: p.darwin === false ? null : false }))} sx={{ justifyContent: 'flex-start', textTransform: 'none', borderRadius: 2, py: 0.75, fontSize: 13, fontWeight: 600, ...(filters.darwin === false ? { background: 'hsl(var(--primary) / 0.15)', borderColor: 'hsl(var(--primary) / 0.5)', color: 'hsl(var(--accent))', boxShadow: 'none' } : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-secondary))' }) }}>Darwin Inativo</Button>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>Status Contato</Typography>
          <Button fullWidth variant="outlined" onClick={() => setFilters((p) => ({ ...p, contact: p.contact === true ? null : true }))} sx={{ justifyContent: 'flex-start', textTransform: 'none', borderRadius: 2, py: 0.75, fontSize: 13, fontWeight: 600, ...(filters.contact === true ? { background: 'hsl(var(--primary) / 0.15)', borderColor: 'hsl(var(--primary) / 0.5)', color: 'hsl(var(--accent))', boxShadow: 'none' } : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-secondary))' }) }}>Contatos Ativos</Button>
          <Button fullWidth variant="outlined" onClick={() => setFilters((p) => ({ ...p, contact: p.contact === false ? null : false }))} sx={{ justifyContent: 'flex-start', textTransform: 'none', borderRadius: 2, py: 0.75, fontSize: 13, fontWeight: 600, ...(filters.contact === false ? { background: 'hsl(var(--primary) / 0.15)', borderColor: 'hsl(var(--primary) / 0.5)', color: 'hsl(var(--accent))', boxShadow: 'none' } : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-secondary))' }) }}>Contatos Inativos</Button>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>Perfil Contato</Typography>
          <Button fullWidth variant="outlined" onClick={() => setFilters((p) => ({ ...p, gelo: p.gelo === true ? null : true }))} sx={{ justifyContent: 'flex-start', textTransform: 'none', borderRadius: 2, py: 0.75, fontSize: 13, fontWeight: 600, ...(filters.gelo === true ? { background: 'hsl(var(--primary) / 0.15)', borderColor: 'hsl(var(--primary) / 0.5)', color: 'hsl(var(--accent))', boxShadow: 'none' } : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-secondary))' }) }}>Contatos Gelos</Button>
          <Button fullWidth variant="outlined" onClick={() => setFilters((p) => ({ ...p, reclamacao: p.reclamacao === true ? null : true }))} sx={{ justifyContent: 'flex-start', textTransform: 'none', borderRadius: 2, py: 0.75, fontSize: 13, fontWeight: 600, ...(filters.reclamacao === true ? { background: 'hsl(var(--primary) / 0.15)', borderColor: 'hsl(var(--primary) / 0.5)', color: 'hsl(var(--accent))', boxShadow: 'none' } : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-secondary))' }) }}>Contatos com Reclamações</Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, bgcolor: 'hsl(var(--error) / 0.12)', color: 'hsl(var(--error))', border: '1px solid hsl(var(--error) / 0.3)', borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
        <GlassPanel borderRadius={14} className="p-4" style={{ flex: '1 1 200px', minWidth: 200 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1 }}>
            <Users size={20} color="hsl(var(--accent))" />
            <Typography variant="h5" sx={{ color: 'hsl(var(--text-primary))', fontWeight: 700 }}>{summary.total}</Typography>
          </Box>
          <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'hsl(var(--text-secondary))', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total de Contatos</Typography>
        </GlassPanel>
      </Box>

      {loading && (
        <PageLoader message="Carregando contatos..." />
      )}

      {!loading && filtered.length === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <Typography sx={{ color: 'hsl(var(--text-secondary))' }}>Nenhum contato encontrado com os filtros aplicados.</Typography>
        </Box>
      )}

      {!loading && filtered.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          {paginated.map((c) => {
            const isLoading = Boolean(actionLoading[c.telefone])
            return (
              <Box key={c.telefone} sx={{
                width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.333% - 11px)', lg: 'calc(25% - 12px)' },
                minWidth: 250, p: 2, borderRadius: 3, bgcolor: 'hsl(var(--surface-2))',
                border: '1px solid hsl(var(--border))', transition: 'all 0.2s ease',
                '&:hover': { bgcolor: 'hsl(var(--surface-2))', border: '1px solid hsl(var(--primary) / 0.2)' },
              }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }} onClick={() => openEdit(c)}>
                    <Typography sx={{ color: 'hsl(var(--text-primary))', fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{c.nome}</Typography>
                    {c.isGelado && <Snowflake size={14} color="#60a5fa" />}
                  </Box>
                  <Box
                    onClick={() => handleVerOcorrencias(c)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer',
                      px: 1, py: 0.4, borderRadius: 1, bgcolor: 'hsl(var(--accent) / 0.1)',
                      border: '1px solid hsl(var(--accent) / 0.2)',
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: 'hsl(var(--accent) / 0.18)', border: '1px solid hsl(var(--accent) / 0.4)' },
                    }}
                  >
                    <FileText size={13} color="hsl(var(--accent))" />
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--accent))', whiteSpace: 'nowrap' }}>Ocorrências</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mb: 2, cursor: 'pointer' }} onClick={() => openEdit(c)}>
                  <Typography sx={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--text-secondary))' }}>Telefone</Typography>
                  <Typography sx={{ color: 'hsl(var(--text-primary))', fontSize: 18, fontWeight: 600, letterSpacing: '0.04em' }}>{formatPhoneDisplay(c.telefone)}</Typography>
                  {c.dataCriacao && (
                    <Box sx={{ mt: 0.5 }}>
                      <Typography sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'hsl(var(--text-secondary))' }}>Registrado em</Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 500, color: 'hsl(var(--text-primary))' }}>{formatDate(c.dataCriacao)}</Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
                    <Button size="small" disabled={isLoading} onClick={() => handleToggleDarwin(c, true)} sx={{ textTransform: 'none', fontSize: 11, fontWeight: 600, borderRadius: 999, py: 0.5, ...(c.darwinAtivo ? { background: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--accent))', border: '1px solid hsl(var(--accent) / 0.5)', boxShadow: 'none' } : { border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-secondary))' }) }}>Darwin IA Ativado</Button>
                    <Button size="small" disabled={isLoading} onClick={() => handleToggleDarwin(c, false)} sx={{ textTransform: 'none', fontSize: 11, fontWeight: 600, borderRadius: 999, py: 0.5, ...(!c.darwinAtivo ? { background: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--accent))', border: '1px solid hsl(var(--accent) / 0.5)', boxShadow: 'none' } : { border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-secondary))' }) }}>Darwin IA Desligado</Button>
                  </Box>
                </Box>
              </Box>
            )
          })}
        </Box>
      )}

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
          <Button size="small" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} sx={{ color: 'hsl(var(--accent))', textTransform: 'none' }}>Anterior</Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1).map((p, idx, arr) => (
            <React.Fragment key={p}>
              {idx > 0 && arr[idx - 1] !== p - 1 && <Typography sx={{ color: 'hsl(var(--text-secondary))' }}>...</Typography>}
              <Chip label={p} size="small" onClick={() => setCurrentPage(p)} sx={chipSx(currentPage === p)} />
            </React.Fragment>
          ))}
          <Button size="small" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)} sx={{ color: 'hsl(var(--accent))', textTransform: 'none' }}>Próxima</Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
            <TextField
              size="small"
              type="number"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const p = parseInt(pageInput)
                  if (!isNaN(p) && p >= 1 && p <= totalPages) setCurrentPage(p)
                }
              }}
              sx={{ width: 60, ...inputSx }}
              inputProps={{ min: 1, max: totalPages, style: { textAlign: 'center' }, autoComplete: 'off' }}
            />
            <Button size="small" onClick={() => {
              const p = parseInt(pageInput)
              if (!isNaN(p) && p >= 1 && p <= totalPages) setCurrentPage(p)
            }} sx={{ color: 'hsl(var(--accent))', textTransform: 'none' }}>Ir</Button>
          </Box>
        </Box>
      )}

      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogSx }}>
        <DialogTitle sx={{ color: 'hsl(var(--accent))', fontWeight: 700 }}>{editing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} onBlur={handleTelefoneBlur} variant="filled" sx={inputSx} disabled={!!editing} inputProps={{ autoComplete: 'off' }} />
          <TextField label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />
          <TextField label="Cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />
          <Autocomplete
            fullWidth
            freeSolo
            openOnFocus
            autoHighlight
            selectOnFocus
            clearOnBlur={false}
            handleHomeEndKeys
            options={enderecos.map((e) => e.logradouro)}
            value={form.endereco}
            onInputChange={(_, v) => setForm({ ...form, endereco: v ?? '' })}
            onChange={(_, v) => setForm({ ...form, endereco: v ?? '' })}
            renderInput={(params) => <TextField {...params} label="Endereço" variant="filled" sx={inputSx} />}
            sx={{ '& .MuiAutocomplete-root': { width: '100%' } }}
          />
          <Autocomplete
            fullWidth
            freeSolo
            openOnFocus
            autoHighlight
            selectOnFocus
            clearOnBlur={false}
            handleHomeEndKeys
            options={[...new Set(enderecos.map((e) => e.bairro))].sort()}
            value={form.bairro}
            onInputChange={(_, v) => setForm({ ...form, bairro: v ?? '' })}
            onChange={(_, v) => setForm({ ...form, bairro: v ?? '' })}
            renderInput={(params) => <TextField {...params} label="Bairro" variant="filled" sx={inputSx} />}
            sx={{ '& .MuiAutocomplete-root': { width: '100%' } }}
          />
          <TextField label="Data de Nascimento" fullWidth type="date" value={form.dataNascimento} onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })} variant="filled" sx={inputSx} InputLabelProps={{ shrink: true }} inputProps={{ autoComplete: 'off' }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <Box>
            {editing && editing.isCliente && (
              <Button onClick={() => { setToDelete(editing); setConfirmOpen(true); setOpenModal(false) }} sx={{ color: 'hsl(var(--error))', textTransform: 'none', borderRadius: 2, border: '1px solid hsl(var(--error) / 0.3)' }}>Excluir</Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={() => setOpenModal(false)} sx={{ color: 'hsl(var(--text-secondary))', textTransform: 'none' }}>Cancelar</Button>
            <Button onClick={save} variant="contained" sx={{ background: 'hsl(var(--primary))', textTransform: 'none', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>Salvar</Button>
          </Box>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir Cliente"
        message={`Confirmar exclusão de ${toDelete?.nome}?`}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
        destructive
      />

      <Dialog open={ocorrenciaDialogOpen} onClose={() => setOcorrenciaDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: dialogSx }}>
        <DialogTitle sx={{ color: 'hsl(var(--accent))', fontWeight: 700 }}>
          Ocorrências de {ocorrenciaContact?.nome || formatPhoneDisplay(ocorrenciaContact?.telefone || '')}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {/* Filtros */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', p: 1.5, borderRadius: 2, bgcolor: 'hsl(var(--surface-2))', border: '1px solid hsl(var(--border))' }}>
            <Select
              size="small"
              variant="filled"
              value={ocFiltroStatus}
              displayEmpty
              onChange={(e) => setOcFiltroStatus(e.target.value)}
              sx={{ fontSize: 12, minWidth: 130, ...inputSx }}
            >
              <MenuItem value="">Todas colunas</MenuItem>
              <MenuItem value="pendentes">Reclamações Pendentes</MenuItem>
              <MenuItem value="em-analise">Em Análise</MenuItem>
              <MenuItem value="aprovar-indicacao">Aprovado como Indicação</MenuItem>
              <MenuItem value="aprovar-requerimento">Aprovado como Requerimento</MenuItem>
              <MenuItem value="reprovar">Reprovado</MenuItem>
            </Select>
            <Select
              size="small"
              variant="filled"
              value={ocFiltroTipo}
              displayEmpty
              onChange={(e) => setOcFiltroTipo(e.target.value)}
              sx={{ fontSize: 12, minWidth: 130, ...inputSx }}
            >
              <MenuItem value="">Todos tipos</MenuItem>
              <MenuItem value="indicacao">Indicação</MenuItem>
              <MenuItem value="requerimento">Requerimento</MenuItem>
              <MenuItem value="ambos">Ambos</MenuItem>
            </Select>
            <Select
              size="small"
              variant="filled"
              value={ocFiltroCategoria}
              displayEmpty
              onChange={(e) => setOcFiltroCategoria(e.target.value)}
              sx={{ fontSize: 12, minWidth: 150, ...inputSx }}
            >
              <MenuItem value="">Todas categorias</MenuItem>
              {Object.entries(categoryDisplayName).map(([key, label]) => (
                <MenuItem key={key} value={key}>{label}</MenuItem>
              ))}
            </Select>
            <TextField type="date" size="small" variant="filled" label="De" InputLabelProps={{ shrink: true }} value={ocFiltroInicio} onChange={(e) => setOcFiltroInicio(e.target.value)} sx={{ ...inputSx, minWidth: 120 }} />
            <TextField type="date" size="small" variant="filled" label="Até" InputLabelProps={{ shrink: true }} value={ocFiltroFim} onChange={(e) => setOcFiltroFim(e.target.value)} sx={{ ...inputSx, minWidth: 120 }} />
            <Button size="small" onClick={() => { setOcFiltroStatus(''); setOcFiltroTipo(''); setOcFiltroCategoria(''); setOcFiltroInicio(''); setOcFiltroFim('') }} sx={{ color: 'hsl(var(--text-secondary))', textTransform: 'none', fontSize: 11 }}>Limpar</Button>
          </Box>

          {/* Resultado */}
          {ocorrenciaLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <Typography sx={{ color: 'hsl(var(--text-secondary))' }}>Carregando ocorrências...</Typography>
            </Box>
          )}
          {!ocorrenciaLoading && ocorrenciaFiltrada.length === 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <Typography sx={{ color: 'hsl(var(--text-secondary))' }}>Nenhuma ocorrência encontrada</Typography>
            </Box>
          )}
          {!ocorrenciaLoading && ocorrenciaFiltrada.map((o) => {
            const campos = detalhesArr(o.detalhes)
            return (
              <Box key={o.id} sx={{
                p: 2, borderRadius: 2, bgcolor: 'hsl(var(--surface-2))',
                border: '1px solid hsl(var(--border))', display: 'flex', flexDirection: 'column', gap: 1.5,
              }}>
                {/* Header: categoria + status + tipo */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Box sx={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-primary))', bgcolor: 'hsl(var(--border))', px: 1, py: 0.3, borderRadius: 1 }}>
                      {categoryDisplayName[o.categoria] ?? o.categoria}
                    </Box>
                    {o.tipo && (
                      <Box sx={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--accent))', bgcolor: 'hsl(var(--accent) / 0.1)', px: 1, py: 0.3, borderRadius: 1, textTransform: 'capitalize' }}>
                        {o.tipo}
                      </Box>
                    )}
                    {o.ehManual && (
                      <Box sx={{ fontSize: 10, fontWeight: 700, color: '#E89E70', bgcolor: '#E89E7015', px: 1, py: 0.3, borderRadius: 1 }}>Manual</Box>
                    )}
                  </Box>
                  <Box sx={{ fontSize: 10, fontWeight: 700, color: '#fff', bgcolor: columnColors[getColumnId(o)] || '#A1A9B8', px: 1, py: 0.3, borderRadius: 1 }}>
                    {columnLabels[getColumnId(o)] ?? o.status}
                  </Box>
                </Box>

                {/* Situação resumida */}
                {o.situacaoResumida && (
                  <Box>
                    <Typography sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'hsl(var(--text-secondary))', mb: 0.3 }}>Situação Resumida</Typography>
                    <Typography sx={{ fontSize: 12, color: 'hsl(var(--text-primary))', lineHeight: 1.5 }}>
                      {o.situacaoResumida}
                    </Typography>
                  </Box>
                )}

                {/* Detalhes estruturados */}
                {campos.length > 0 && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1, pt: 0.5, borderTop: '1px solid hsl(var(--border))' }}>
                    {campos.map((c) => (
                      <Box key={c.label} sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography sx={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-secondary) / 0.7)', fontWeight: 600 }}>{c.label}</Typography>
                        <Typography sx={{ fontSize: 12, color: 'hsl(var(--text-primary))', lineHeight: 1.3 }}>{c.value}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Mídias */}
                {o.detalhes.midiasAnimal && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', pt: 0.5, borderTop: '1px solid hsl(var(--border))' }}>
                    <Typography sx={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-secondary) / 0.7)', fontWeight: 600, width: '100%' }}>Mídias</Typography>
                    {o.detalhes.midiasAnimal.split(',').map((url, i) => {
                      const u = url.trim()
                      const isImage = /\.(jpeg|jpg|png|gif|webp|bmp|svg|heic|heif)$/i.test(u)
                      const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(u)
                      if (isImage) {
                        return (
                          <Box key={i} onClick={() => { setLightboxImg(u); setLightboxIsVideo(false) }} sx={{ display: 'block', borderRadius: 1, overflow: 'hidden', border: '1px solid hsl(var(--border))', cursor: 'pointer', '&:hover': { border: '1px solid hsl(var(--accent) / 0.5)' } }}>
                            <Box component="img" src={u} alt={`Mídia ${i + 1}`} sx={{ display: 'block', width: 80, height: 80, objectFit: 'cover' }} />
                          </Box>
                        )
                      }
                      if (isVideo) {
                        return (
                          <Box key={i} onClick={() => { setLightboxImg(u); setLightboxIsVideo(true) }} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, borderRadius: 1, overflow: 'hidden', border: '1px solid hsl(var(--border))', cursor: 'pointer', bgcolor: 'hsl(var(--surface))', position: 'relative', '&:hover': { border: '1px solid hsl(var(--accent) / 0.5)' } }}>
                            <Box component="video" src={u} sx={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} muted preload="metadata" />
                            <Box sx={{ position: 'absolute', fontSize: 20 }}>▶</Box>
                          </Box>
                        )
                      }
                      return (
                        <Box key={i} component="a" href={u} target="_blank" sx={{ fontSize: 11, color: 'hsl(var(--accent))', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                          📎 Mídia {i + 1}
                        </Box>
                      )
                    })}
                  </Box>
                )}

                {/* Observação + mensagem final */}
                {o.observacao && (
                  <Box sx={{ pt: 0.5, borderTop: '1px solid hsl(var(--border))' }}>
                    <Typography sx={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-secondary) / 0.7)', fontWeight: 600 }}>Observação</Typography>
                    <Typography sx={{ fontSize: 12, color: 'hsl(var(--text-primary))', lineHeight: 1.4, fontStyle: 'italic' }}>{o.observacao}</Typography>
                  </Box>
                )}
                {o.mensagemFinal && (
                  <Box>
                    <Typography sx={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-secondary) / 0.7)', fontWeight: 600 }}>Mensagem Final</Typography>
                    <Typography sx={{ fontSize: 12, color: 'hsl(var(--text-primary))', lineHeight: 1.4 }}>{o.mensagemFinal}</Typography>
                  </Box>
                )}

                {/* Datas */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', pt: 0.5, borderTop: '1px solid hsl(var(--border))' }}>
                  <Typography sx={{ fontSize: 10, color: 'hsl(var(--text-secondary) / 0.6)' }}>
                    Criado: {formatDate(o.dataCriacao)}
                  </Typography>
                  {o.dataAtualizacao && o.dataAtualizacao !== o.dataCriacao && (
                    <Typography sx={{ fontSize: 10, color: 'hsl(var(--text-secondary) / 0.6)' }}>
                      Atualizado: {formatDate(o.dataAtualizacao)}
                    </Typography>
                  )}
                </Box>
              </Box>
            )
          })}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOcorrenciaDialogOpen(false)} sx={{ color: 'hsl(var(--text-secondary))', textTransform: 'none' }}>Fechar</Button>
        </DialogActions>
        {lightboxImg && (
          <Box
            onClick={() => { setLightboxImg(null); setLightboxIsVideo(false) }}
            sx={{
              position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
              bgcolor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', zIndex: 1300, cursor: 'zoom-out',
            }}
          >
            <Box
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setLightboxImg(null); setLightboxIsVideo(false) }}
              sx={{ position: 'absolute', top: 16, right: 24, color: '#fff', fontSize: 28, cursor: 'pointer', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
            >
              ✕
            </Box>
            {lightboxIsVideo ? (
              <Box component="video" src={lightboxImg} controls autoPlay
                sx={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 1 }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              />
            ) : (
              <Box component="img" src={lightboxImg} alt="Mídia ampliada"
                sx={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 1 }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              />
            )}
          </Box>
        )}
      </Dialog>
    </Box>
  )
}

export default ContatosPage
