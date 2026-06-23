import * as React from 'react'
import { useState, useEffect, useRef } from 'react'
import {
  Autocomplete, Box, CircularProgress, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, MenuItem, useMediaQuery, useTheme,
} from '@mui/material'
import {
  CheckCircle, ChevronLeft, ChevronRight, Eye, FileText, Plus, Trash2, X, XCircle, Pencil, Tag, Calendar, Video, Inbox,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ConfirmDialog from '../components/ConfirmDialog'
import { inputSx, dialogSx } from '../utils/inputSx'
import {
  getAllOcorrencias, createOcorrencia, deleteOcorrencia, aprovarInquerito, aprovarRequerimento, reprovarInquerito, updateOcorrencia, colocarEmAnalise, colocarComoCriado,
} from '../services/reclamacaoService'
import { getAllClientes, clienteExiste } from '../services/clienteService'
import { getAllEnderecos } from '../services/enderecoService'
import { formatPhoneDisplay, normalizeTelefone } from '../utils/phone'
import { uploadMidia } from '../services/midiaService'
import { formatDate, formatRelativeTime } from '../utils/date'
import { categoryDisplayName } from '../utils/categories'
import { statusDisplay } from '../components/StatusChip'
import KanbanSkeleton from '../components/KanbanSkeleton'
import type { Ocorrencia, OcorrenciaRequest, Cliente, Logradouro } from '../types'

/* ───────── Kanban config ───────── */

interface ColumnDef {
  id: string
  label: string
  color: string
  headerBg: string
}

const COLUMNS: ColumnDef[] = [
  { id: 'pendentes', label: 'Reclamações Pendentes', color: '#A1A9B8', headerBg: 'hsl(var(--text-secondary) / 0.12)' },
  { id: 'em-analise', label: 'Em Análise', color: '#62A1D8', headerBg: 'hsl(var(--info) / 0.12)' },
  { id: 'aprovar-indicacao', label: 'Aprovar como Indicação', color: '#66BB80', headerBg: 'hsl(var(--success) / 0.12)' },
  { id: 'aprovar-requerimento', label: 'Aprovar como Requerimento', color: '#E89E70', headerBg: 'hsl(var(--accent) / 0.12)' },
  { id: 'reprovar', label: 'Reprovar', color: '#D16670', headerBg: 'hsl(var(--error) / 0.12)' },
]

const CATEGORIAS = [
  'geral',
  'maus tratos',
  'abandono presenciado',
  'animal apareceu na rua',
  'ajuda animal comunitario',
  'saude animal',
  'castracao eletiva',
  'castracao emergencial',
  'animais nao domiciliados',
  'animal desaparecido',
  'animal para ser adotado',
  'adocao de animais',
  'animal grande porte',
  'animal atropelado',
  'cuidados animais',
  'animais silvestres',
  'equipamentos',
]

const CATEGORY_FIELDS: Record<string, string[]> = {
  geral: ['situacaoResumida'],
  'maus tratos': ['enderecoOcorrencia', 'conheceTutor', 'condicoesAnimal', 'frequenciaMausTratos', 'midiasAnimal', 'protocoloDenuncia', 'situacaoResumida'],
  'abandono presenciado': ['midiasAnimal', 'protocoloDenuncia', 'situacaoResumida'],
  'animal apareceu na rua': ['especieAnimal', 'idadeAnimal', 'sexoAnimal', 'bairroAnimal', 'nomeResponsavelAnimal', 'telefoneResponsavelAnimal', 'historicoAnimal', 'midiasAnimal', 'situacaoResumida'],
  'ajuda animal comunitario': ['especieAnimal', 'idadeAnimal', 'bairroAnimal', 'nomeResponsavelAnimal', 'telefoneResponsavelAnimal', 'historicoAnimal', 'midiasAnimal', 'situacaoResumida'],
  'saude animal': ['temCadUnico', 'ehProtetorIndependente', 'situacaoAnimal', 'midiasAnimal', 'situacaoResumida'],
  'castracao eletiva': ['situacaoResumida'],
  'castracao emergencial': ['especieAnimal', 'idadeAnimal', 'quandoCruzou', 'infoSaudeAnimal', 'situacaoResumida'],
  'animais nao domiciliados': ['enderecoOcorrencia', 'conheceTutor', 'condicoesAnimal', 'detalhesDenuncia', 'protocoloDenuncia', 'midiasAnimal', 'situacaoResumida'],
  'animal desaparecido': ['nomeAnimal', 'especieAnimal', 'idadeAnimal', 'sexoAnimal', 'bairroAnimal', 'nomeResponsavelAnimal', 'telefoneResponsavelAnimal', 'historicoAnimal', 'situacaoResumida'],
  'animal para ser adotado': ['nomeAnimal', 'especieAnimal', 'idadeAnimal', 'sexoAnimal', 'bairroAnimal', 'nomeResponsavelAnimal', 'telefoneResponsavelAnimal', 'historicoAnimal', 'midiasAnimal', 'situacaoResumida'],
  'adocao de animais': [],
  'animal grande porte': ['situacaoResumida'],
  'animal atropelado': ['situacaoResumida'],
  'cuidados animais': ['situacaoResumida'],
  'animais silvestres': ['especieAnimal', 'tempoAnimalLocal', 'ferimentosAnimal', 'providenciasAnimal', 'nomeResponsavelAnimal', 'midiasAnimal', 'situacaoResumida'],
  equipamentos: ['situacaoResumida'],
}

const getActiveFields = (cat: string) => CATEGORY_FIELDS[cat] || CATEGORY_FIELDS['geral']
const showField = (name: string, cat: string) => getActiveFields(cat).includes(name)
const showSection = (names: string[], cat: string) => names.some((n) => getActiveFields(cat).includes(n))

const formatTelefoneInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

interface MidiaItem {
  id: string
  url: string
  isUploading: boolean
  isVideo: boolean
}

const MidiaUploadField: React.FC<{
  form: OcorrenciaRequest
  setForm: React.Dispatch<React.SetStateAction<OcorrenciaRequest>>
  onImageClick?: (urls: string[], index: number) => void
}> = ({ form, setForm, onImageClick }) => {
  const [items, setItems] = React.useState<MidiaItem[]>(() => {
    const urls = form.midiasAnimal ? form.midiasAnimal.split(',').map((m) => m.trim()).filter(Boolean) : []
    return urls.map((url, i) => ({ id: `s-${i}`, url, isUploading: false, isVideo: /\.(mp4|avi|mov|webm)($|\?)/i.test(url) }))
  })
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const urls = form.midiasAnimal ? form.midiasAnimal.split(',').map((m) => m.trim()).filter(Boolean) : []
    setItems((prev) => {
      const uploading = prev.filter((p) => p.isUploading)
      const saved = urls.map((url, i) => {
        const existing = prev.find((p) => p.url === url && !p.isUploading)
        return existing ?? { id: `s-${i}-${url}`, url, isUploading: false, isVideo: /\.(mp4|avi|mov|webm)($|\?)/i.test(url) }
      })
      return [...saved, ...uploading]
    })
  }, [form.midiasAnimal])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    const isVideo = file.type.startsWith('video/')
    const tempId = `tmp-${Date.now()}`
    const tempItem: MidiaItem = { id: tempId, url: previewUrl, isUploading: true, isVideo }
    setItems((prev) => [...prev, tempItem])
    try {
      const res = await uploadMidia(file)
      const serverUrl = res.url
      setItems((prev) => prev.map((p) => (p.id === tempId ? { ...p, url: serverUrl, isUploading: false } : p)))
      setForm((prev) => {
        const existing = prev.midiasAnimal ? prev.midiasAnimal.split(',').map((m) => m.trim()).filter(Boolean) : []
        const updated = existing.length > 0 ? `${prev.midiasAnimal},${serverUrl}` : serverUrl
        return { ...prev, midiasAnimal: updated }
      })
    } catch (err: any) {
      alert(err.message || 'Erro ao fazer upload')
      setItems((prev) => prev.filter((p) => p.id !== tempId))
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeItem = (id: string) => {
    const item = items.find((i) => i.id === id)
    if (item && item.isUploading) URL.revokeObjectURL(item.url)
    const next = items.filter((i) => i.id !== id)
    setItems(next)
    const urls = next.filter((i) => !i.isUploading).map((i) => i.url)
    setForm((prev) => ({ ...prev, midiasAnimal: urls.join(',') }))
  }

  return (
    <>
      <Typography sx={{ fontSize: 12, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em', mt: 1, fontWeight: 600 }}>Mídias</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <input type="file" accept="image/*,video/*" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileChange} />
        <Button size="small" variant="outlined" onClick={() => fileInputRef.current?.click()} sx={{ color: 'hsl(var(--accent))', borderColor: 'hsl(var(--accent) / 0.4)', textTransform: 'none', borderRadius: 2 }}>
          <Plus size={16} />
          <Box component="span" sx={{ ml: 1 }}>Adicionar mídia</Box>
        </Button>
      </Box>
      {items.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
          {items.map((item) => (
            <Box key={item.id} sx={{ position: 'relative', width: 80, height: 80, borderRadius: 1, overflow: 'hidden', bgcolor: 'hsl(var(--surface-2))', flexShrink: 0 }}>
              {item.isVideo ? (
                <Box sx={{ width: '100%', height: '100%', cursor: onImageClick ? 'zoom-in' : 'default', position: 'relative' }} onClick={() => {
                  if (!onImageClick) return
                  const allUrls = items.map((i) => i.url)
                  const idx = allUrls.indexOf(item.url)
                  onImageClick(allUrls, idx >= 0 ? idx : 0)
                }}>
                  <Box component="video" src={item.url} sx={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} muted />
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.35)' }}>
                    <Video size={20} color="#fff" />
                  </Box>
                </Box>
              ) : (
                <Box component="img" src={item.url} sx={{ width: '100%', height: '100%', objectFit: 'cover', cursor: onImageClick ? 'zoom-in' : 'default' }} onClick={() => {
                  if (!onImageClick) return
                  const allUrls = items.map((i) => i.url)
                  const idx = allUrls.indexOf(item.url)
                  onImageClick(allUrls, idx >= 0 ? idx : 0)
                }} />
              )}
              {item.isUploading && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.5)' }}>
                  <CircularProgress size={24} sx={{ color: 'hsl(var(--accent))' }} />
                </Box>
              )}
              <IconButton size="small" onClick={() => removeItem(item.id)} sx={{ position: 'absolute', top: 2, right: 2, color: '#fff', bgcolor: 'rgba(0,0,0,0.4)', p: 0.3, '&:hover': { bgcolor: 'rgba(248,113,113,0.8)' } }}>
                <X size={12} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </>
  )
}

const FormFields: React.FC<{
  form: OcorrenciaRequest
  setForm: React.Dispatch<React.SetStateAction<OcorrenciaRequest>>
  cat: string
  enderecos: Logradouro[]
  onImageClick?: (urls: string[], index: number) => void
  onTelefoneLookup?: (telefone: string) => Promise<Cliente | false>
}> = ({ form, setForm, cat, enderecos, onImageClick, onTelefoneLookup }) => {
  const [autoFilledResp, setAutoFilledResp] = useState(false)
  const handleTelResp = (v: string) => {
    const f = formatTelefoneInput(v)
    setForm((prev) => ({ ...prev, telefoneResponsavelAnimal: f }))
  }
  useEffect(() => {
    if (!onTelefoneLookup) return
    const digits = (form.telefoneResponsavelAnimal || '').replace(/\D/g, '')
    if (digits.length < 11) { setAutoFilledResp(false); return }
    const timer = setTimeout(() => {
      onTelefoneLookup(normalizeTelefone(form.telefoneResponsavelAnimal || '')).then((cliente) => {
        if (cliente) {
          setForm((prev) => ({ ...prev, nomeResponsavelAnimal: cliente.nome || prev.nomeResponsavelAnimal }))
          setAutoFilledResp(true)
        } else {
          setAutoFilledResp(false)
        }
      }).catch(() => setAutoFilledResp(false))
    }, 500)
    return () => clearTimeout(timer)
  }, [form.telefoneResponsavelAnimal])
  return (
    <Box key={cat} sx={{ display: 'flex', flexDirection: 'column', gap: 2, animation: 'fadeSlideIn 0.35s ease', '@keyframes fadeSlideIn': { from: { opacity: 0, transform: 'translateX(16px)' }, to: { opacity: 1, transform: 'translateX(0)' } } }}>
      {showSection(['situacaoResumida', 'enderecoOcorrencia', 'conheceTutor', 'detalhesDenuncia', 'protocoloDenuncia'], cat) && (
        <>
          <Typography sx={{ fontSize: 12, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em', mt: 1, fontWeight: 600 }}>Dados da Ocorrência</Typography>
          {showField('situacaoResumida', cat) && <TextField label="Situação Resumida" fullWidth multiline rows={3} value={form.situacaoResumida} onChange={(e) => setForm({ ...form, situacaoResumida: e.target.value })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />}
          {showField('enderecoOcorrencia', cat) && <TextField label="Endereço da Ocorrência" fullWidth value={form.enderecoOcorrencia} onChange={(e) => setForm({ ...form, enderecoOcorrencia: e.target.value })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />}
          {showField('conheceTutor', cat) && (
            <TextField select fullWidth label="Conhece o Tutor" variant="filled" value={form.conheceTutor} onChange={(e) => setForm({ ...form, conheceTutor: e.target.value })} sx={inputSx}>
              <MenuItem value="">Não informado</MenuItem>
              <MenuItem value="SIM">Sim</MenuItem>
              <MenuItem value="NAO">Não</MenuItem>
            </TextField>
          )}
          {showField('detalhesDenuncia', cat) && <TextField label="Detalhes Denúncia" fullWidth multiline rows={2} value={form.detalhesDenuncia} onChange={(e) => setForm({ ...form, detalhesDenuncia: e.target.value })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />}
          {showField('protocoloDenuncia', cat) && <TextField label="Protocolo Denúncia" fullWidth type="number" value={form.protocoloDenuncia} onChange={(e) => setForm({ ...form, protocoloDenuncia: e.target.value.replace(/\D/g, '') })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />}
        </>
      )}

      {showSection(['nomeAnimal', 'especieAnimal', 'idadeAnimal', 'sexoAnimal', 'bairroAnimal', 'condicoesAnimal'], cat) && (
        <>
          <Typography sx={{ fontSize: 12, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em', mt: 1, fontWeight: 600 }}>Dados do Animal</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {showField('nomeAnimal', cat) && <TextField label="Nome" fullWidth value={form.nomeAnimal} onChange={(e) => setForm({ ...form, nomeAnimal: e.target.value })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />}
            {showField('especieAnimal', cat) && <TextField label="Espécie" fullWidth value={form.especieAnimal} onChange={(e) => setForm({ ...form, especieAnimal: e.target.value })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />}
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {showField('idadeAnimal', cat) && <TextField label="Idade" fullWidth type="number" value={form.idadeAnimal} onChange={(e) => setForm({ ...form, idadeAnimal: e.target.value })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />}
            {showField('sexoAnimal', cat) && (
              <TextField select fullWidth label="Sexo" variant="filled" value={form.sexoAnimal} onChange={(e) => setForm({ ...form, sexoAnimal: e.target.value })} sx={inputSx}>
                <MenuItem value="">Não informado</MenuItem>
                <MenuItem value="MACHO">Macho</MenuItem>
                <MenuItem value="FEMEA">Fêmea</MenuItem>
              </TextField>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {showField('bairroAnimal', cat) && (
              <Autocomplete
                fullWidth
                freeSolo
                selectOnFocus
                clearOnBlur={false}
                handleHomeEndKeys
                options={[...new Set(enderecos.map((e) => e.bairro))].sort()}
                value={form.bairroAnimal}
                onInputChange={(_, v) => setForm((prev) => ({ ...prev, bairroAnimal: v ?? '' }))}
                onChange={(_, v) => setForm((prev) => ({ ...prev, bairroAnimal: v ?? '' }))}
                renderInput={(params) => <TextField {...params} label="Bairro do Animal" variant="filled" sx={inputSx} />}
              />
            )}
            {showField('condicoesAnimal', cat) && <TextField label="Condições" fullWidth value={form.condicoesAnimal} onChange={(e) => setForm({ ...form, condicoesAnimal: e.target.value })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />}
          </Box>
        </>
      )}

      {showField('midiasAnimal', cat) && (
        <MidiaUploadField form={form} setForm={setForm} onImageClick={onImageClick} />
      )}

      {showSection(['nomeResponsavelAnimal', 'telefoneResponsavelAnimal', 'historicoAnimal'], cat) && (
        <>
          <Typography sx={{ fontSize: 12, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em', mt: 1, fontWeight: 600 }}>Dados do Responsável</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {showField('nomeResponsavelAnimal', cat) && <TextField label="Nome do Responsável" fullWidth value={form.nomeResponsavelAnimal} onChange={(e) => setForm({ ...form, nomeResponsavelAnimal: e.target.value })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />}
            {showField('telefoneResponsavelAnimal', cat) && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField label="Telefone do Responsável" fullWidth value={form.telefoneResponsavelAnimal} onChange={(e) => handleTelResp(e.target.value)} variant="filled" sx={inputSx} placeholder="(XX) XXXXX-XXXX" inputProps={{ autoComplete: 'off' }} />
                {autoFilledResp && (
                  <Tooltip title="Nome do responsável preenchido automaticamente">
                    <Box sx={{ mt: 1.5, color: '#66BB80', display: 'flex', alignItems: 'center' }}>
                      <CheckCircle size={20} />
                    </Box>
                  </Tooltip>
                )}
              </Box>
            )}
          </Box>
          {showField('historicoAnimal', cat) && <TextField label="Histórico" fullWidth multiline rows={3} value={form.historicoAnimal} onChange={(e) => setForm({ ...form, historicoAnimal: e.target.value })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />}
        </>
      )}

      {showSection(['frequenciaMausTratos', 'situacaoAnimal', 'tempoAnimalLocal', 'ferimentosAnimal', 'providenciasAnimal', 'temCadUnico', 'quandoCruzou', 'infoSaudeAnimal', 'ehProtetorIndependente'], cat) && (
        <>
          <Typography sx={{ fontSize: 12, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em', mt: 1, fontWeight: 600 }}>Outros Detalhes</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {showField('frequenciaMausTratos', cat) && <TextField label="Frequência Maus Tratos" fullWidth value={form.frequenciaMausTratos} onChange={(e) => setForm({ ...form, frequenciaMausTratos: e.target.value })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />}
            {showField('situacaoAnimal', cat) && <TextField label="Situação Animal" fullWidth value={form.situacaoAnimal} onChange={(e) => setForm({ ...form, situacaoAnimal: e.target.value })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />}
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {showField('tempoAnimalLocal', cat) && <TextField label="Tempo no Local" fullWidth value={form.tempoAnimalLocal} onChange={(e) => setForm({ ...form, tempoAnimalLocal: e.target.value })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />}
            {showField('ferimentosAnimal', cat) && <TextField label="Ferimentos" fullWidth value={form.ferimentosAnimal} onChange={(e) => setForm({ ...form, ferimentosAnimal: e.target.value })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />}
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {showField('providenciasAnimal', cat) && <TextField label="Providências" fullWidth value={form.providenciasAnimal} onChange={(e) => setForm({ ...form, providenciasAnimal: e.target.value })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />}
            {showField('temCadUnico', cat) && (
              <TextField select fullWidth label="Cad. Único" variant="filled" value={form.temCadUnico} onChange={(e) => setForm({ ...form, temCadUnico: e.target.value })} sx={inputSx}>
                <MenuItem value="">Não informado</MenuItem>
                <MenuItem value="sim">Sim</MenuItem>
                <MenuItem value="nao">Não</MenuItem>
              </TextField>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {showField('quandoCruzou', cat) && <TextField label="Quando Cruzou" fullWidth value={form.quandoCruzou} onChange={(e) => setForm({ ...form, quandoCruzou: e.target.value })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />}
            {showField('infoSaudeAnimal', cat) && <TextField label="Info Saúde" fullWidth value={form.infoSaudeAnimal} onChange={(e) => setForm({ ...form, infoSaudeAnimal: e.target.value })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />}
          </Box>
          {showField('ehProtetorIndependente', cat) && (
            <TextField select fullWidth label="É Protetor Independente/ONG" variant="filled" value={form.ehProtetorIndependente} onChange={(e) => setForm({ ...form, ehProtetorIndependente: e.target.value })} sx={inputSx}>
              <MenuItem value="">Não informado</MenuItem>
              <MenuItem value="sim">Sim</MenuItem>
              <MenuItem value="nao">Não</MenuItem>
            </TextField>
          )}
        </>
      )}
    </Box>
  )
}

/* ───────── helpers ───────── */

function getColumnId(r: Ocorrencia): string {
  if (r.status === 'reprovado') return 'reprovar'
  if (r.status === 'aprovado') {
    if (r.tipo === 'indicacao') return 'aprovar-indicacao'
    if (r.tipo === 'requerimento') return 'aprovar-requerimento'
    return 'aprovar-indicacao'
  }
  if (r.status === 'em análise') return 'em-analise'
  return 'pendentes'
}

function itemsForColumn(items: Ocorrencia[], colId: string): Ocorrencia[] {
  return items.filter((r) => getColumnId(r) === colId)
}

/* ───────── helpers ───────── */

function getUrgencyLevel(dataAtualizacao: string): 'high' | 'medium' | 'low' {
  const d = new Date(dataAtualizacao)
  if (isNaN(d.getTime())) return 'low'
  const now = new Date()
  const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  if (diffDays > 7) return 'high'
  if (diffDays > 3) return 'medium'
  return 'low'
}

function calcAge(birthDate?: string): number | null {
  if (!birthDate) return null
  const d = new Date(birthDate)
  if (isNaN(d.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
  return age
}

function filterRows(
  rows: Ocorrencia[],
  clientesMap: Record<string, Cliente>,
  search: string,
  dateFrom: string,
  dateTo: string,
  endereco: string,
  bairro: string,
  cidade: string,
  ageMin: string,
  ageMax: string,
  categoria: string[],
): Ocorrencia[] {
  const s = search.trim().toLowerCase()
  const phoneDigits = s.replace(/\D/g, '')
  return rows.filter((r) => {
    const cliente = clientesMap[r.telefone]
    if (s) {
      const matchName = cliente?.nome?.toLowerCase().includes(s) ?? false
      const matchPhone = phoneDigits ? r.telefone.replace(/\D/g, '').includes(phoneDigits) : false
      if (!matchName && !matchPhone) return false
    }
    if (dateFrom) {
      const dc = new Date(r.dataCriacao)
      const from = new Date(dateFrom)
      if (dc < from) return false
    }
    if (dateTo) {
      const dc = new Date(r.dataCriacao)
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      if (dc > to) return false
    }
    if (endereco && !(cliente?.endereco?.toLowerCase().includes(endereco.toLowerCase()) ?? false)) return false
    if (bairro && !(cliente?.bairro?.toLowerCase().includes(bairro.toLowerCase()) ?? false)) return false
    if (cidade && !(cliente?.cidade?.toLowerCase().includes(cidade.toLowerCase()) ?? false)) return false
    const age = calcAge(cliente?.dataNascimento)
    if (ageMin && age !== null && age < parseInt(ageMin)) return false
    if (ageMax && age !== null && age > parseInt(ageMax)) return false
    if (categoria.length > 0 && !categoria.includes(r.categoria)) return false
    return true
  })
}

/* ───────── component ───────── */

const ReclamacoesPage: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [rows, setRows] = useState<Ocorrencia[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const kanbanRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef<number | null>(null)

  const stopAutoScroll = () => {
    if (autoScrollRef.current !== null) {
      cancelAnimationFrame(autoScrollRef.current)
      autoScrollRef.current = null
    }
  }

  const startAutoScroll = (clientX: number) => {
    const container = kanbanRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const edge = 80
    const speed = 15
    const stop = () => {
      stopAutoScroll()
      autoScrollRef.current = null
    }
    if (clientX < rect.left + edge) {
      const step = () => {
        container.scrollLeft -= speed
        autoScrollRef.current = requestAnimationFrame(step)
      }
      stopAutoScroll()
      autoScrollRef.current = requestAnimationFrame(step)
    } else if (clientX > rect.right - edge) {
      const step = () => {
        container.scrollLeft += speed
        autoScrollRef.current = requestAnimationFrame(step)
      }
      stopAutoScroll()
      autoScrollRef.current = requestAnimationFrame(step)
    } else {
      stop()
    }
  }

  /* dialogs */
  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState<Ocorrencia | null>(null)
  const emptyEditForm: OcorrenciaRequest = {
    telefone: '', nomeCliente: '', enderecoCliente: '', bairroCliente: '', cidadeCliente: 'Sorocaba',
    dataNascimentoCliente: '', situacaoResumida: '', categoria: '', ehManual: true,
    enderecoOcorrencia: '', conheceTutor: '', condicoesAnimal: '', frequenciaMausTratos: '',
    nomeAnimal: '', especieAnimal: '', idadeAnimal: '', sexoAnimal: '', bairroAnimal: '',
    nomeResponsavelAnimal: '', telefoneResponsavelAnimal: '', historicoAnimal: '',
    temCadUnico: '', ehProtetorIndependente: '', situacaoAnimal: '', quandoCruzou: '',
    infoSaudeAnimal: '', detalhesDenuncia: '', tempoAnimalLocal: '', ferimentosAnimal: '',
    providenciasAnimal: '', midiasAnimal: '', protocoloDenuncia: '', regiao: '',
  }
  const [editForm, setEditForm] = useState<OcorrenciaRequest>(emptyEditForm)
  const [editMensagemFinal, setEditMensagemFinal] = useState('')
  const [editObservacao, setEditObservacao] = useState('')

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')

  /* detail modal */
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRow, setDetailRow] = useState<Ocorrencia | null>(null)
  const [detailMidiaPage, setDetailMidiaPage] = useState(1)

  /* lightbox */
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxUrls, setLightboxUrls] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)

  /* create manual */
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<OcorrenciaRequest>({
    telefone: '',
    nomeCliente: '',
    enderecoCliente: '',
    bairroCliente: '',
    cidadeCliente: 'Sorocaba',
    dataNascimentoCliente: '',
    situacaoResumida: '',
    categoria: '',
    ehManual: true,
    observacao: '',
    enderecoOcorrencia: '',
    especieAnimal: '',
    idadeAnimal: '',
    sexoAnimal: '',
    bairroAnimal: '',
    nomeResponsavelAnimal: '',
    telefoneResponsavelAnimal: '',
    historicoAnimal: '',
    midiasAnimal: '',
    regiao: '',
    condicoesAnimal: '',
    frequenciaMausTratos: '',
    nomeAnimal: '',
    temCadUnico: '',
    ehProtetorIndependente: '',
    situacaoAnimal: '',
    quandoCruzou: '',
    infoSaudeAnimal: '',
    detalhesDenuncia: '',
    tempoAnimalLocal: '',
    ferimentosAnimal: '',
    providenciasAnimal: '',
    protocoloDenuncia: '',
  })

  /* enderecos */
  const [enderecos, setEnderecos] = useState<Logradouro[]>([])

  /* auto-fill regiao from client address/bairro, or occurrence fields based on categoria */
  useEffect(() => {
    const { categoria, enderecoOcorrencia, bairroAnimal, enderecoCliente, bairroCliente, regiao } = createForm
    const cat = categoria.toLowerCase()
    let newRegiao = ''
    if (cat === 'maus tratos' || cat === 'animais nao domiciliados') {
      if (enderecoOcorrencia) {
        const match = enderecos.find((e) => e.logradouro.toLowerCase() === enderecoOcorrencia.toLowerCase())
        newRegiao = match?.regiao || ''
      }
    } else if (cat === 'animal apareceu na rua' || cat === 'ajuda animal comunitario' || cat === 'animal desaparecido' || cat === 'animal para ser adotado') {
      if (bairroAnimal) {
        const match = enderecos.find((e) => e.bairro.toLowerCase() === bairroAnimal.toLowerCase())
        newRegiao = match?.regiao || ''
      }
    }
    if (!newRegiao && enderecoCliente) {
      const match = enderecos.find((e) => e.logradouro.toLowerCase() === enderecoCliente.toLowerCase())
      newRegiao = match?.regiao || ''
    }
    if (!newRegiao && bairroCliente) {
      const match = enderecos.find((e) => e.bairro.toLowerCase() === bairroCliente.toLowerCase())
      newRegiao = match?.regiao || ''
    }
    if (newRegiao !== regiao) {
      setCreateForm((prev) => ({ ...prev, regiao: newRegiao }))
    }
  }, [createForm.categoria, createForm.enderecoOcorrencia, createForm.bairroAnimal, createForm.enderecoCliente, createForm.bairroCliente, enderecos])

  /* auto-fill client data when phone has enough digits */
  const [autoFilledPhone, setAutoFilledPhone] = useState(false)
  useEffect(() => {
    const digits = createForm.telefone.replace(/\D/g, '')
    if (digits.length < 11) { setAutoFilledPhone(false); return }
    const timer = setTimeout(() => {
      clienteExiste(normalizeTelefone(createForm.telefone)).then((cliente) => {
        if (cliente) {
          setCreateForm((prev) => ({
            ...prev,
            nomeCliente: cliente.nome || prev.nomeCliente,
            enderecoCliente: cliente.endereco || prev.enderecoCliente,
            bairroCliente: cliente.bairro || prev.bairroCliente,
            cidadeCliente: cliente.cidade || prev.cidadeCliente,
            dataNascimentoCliente: cliente.dataNascimento || prev.dataNascimentoCliente,
          }))
          setAutoFilledPhone(true)
        } else {
          setAutoFilledPhone(false)
        }
      }).catch(() => setAutoFilledPhone(false))
    }, 500)
    return () => clearTimeout(timer)
  }, [createForm.telefone])

  /* filters */
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [enderecoFilter, setEnderecoFilter] = useState('')
  const [bairroFilter, setBairroFilter] = useState('')
  const [cidadeFilter, setCidadeFilter] = useState('')
  const [ageMin, setAgeMin] = useState('')
  const [ageMax, setAgeMax] = useState('')
  const [catFilter, setCatFilter] = useState<string[]>([])

  /* pagination per column */
  const [columnPages, setColumnPages] = useState<Record<string, number>>({})

  /* clientes map (telefone -> Cliente) */
  const [clientesMap, setClientesMap] = useState<Record<string, Cliente>>({})

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300)
    return () => clearTimeout(timer)
  }, [searchText])

  const filteredRows = filterRows(rows, clientesMap, debouncedSearch, dateFrom, dateTo, enderecoFilter, bairroFilter, cidadeFilter, ageMin, ageMax, catFilter)
    .sort((a, b) => new Date(b.dataAtualizacao).getTime() - new Date(a.dataAtualizacao).getTime())

  useEffect(() => {
    load()
  }, [])

  /* browser back button closes modals on mobile */
  const anyModalOpen = detailOpen || createOpen || editOpen || confirmOpen || lightboxOpen
  useEffect(() => {
    if (anyModalOpen) {
      window.history.pushState({ modalOpen: true }, '')
      const handlePopState = () => {
        setDetailOpen(false)
        setCreateOpen(false)
        setEditOpen(false)
        setConfirmOpen(false)
        setLightboxOpen(false)
      }
      window.addEventListener('popstate', handlePopState)
      return () => {
        window.removeEventListener('popstate', handlePopState)
      }
    }
  }, [anyModalOpen])

  const load = () => {
    setLoading(true)
    Promise.all([getAllOcorrencias(), getAllClientes()])
      .then(([ocorrencias, clientes]) => {
        const map: Record<string, Cliente> = {}
        clientes.forEach((c) => { map[c.telefone] = c })
        setClientesMap(map)
        setRows(ocorrencias)
        /* compute default age range */
        let minAge = Infinity
        let maxAge = -Infinity
        clientes.forEach((c) => {
          const age = calcAge(c.dataNascimento)
          if (age !== null) {
            if (age < minAge) minAge = age
            if (age > maxAge) maxAge = age
          }
        })
        if (minAge !== Infinity) {
          setAgeMin(String(minAge))
          setAgeMax(String(maxAge))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  const UPLOAD_BASE_URL = (import.meta.env.VITE_UPLOAD_BASE_URL as string | undefined) || 'https://vereadorajussara.ouvidoria.darwinsistema.com.br'

  const parseMidiaUrls = (raw: string | undefined): string[] => {
    if (!raw) return []
    const urls = raw.split(/[,\s]+/).map((u) => u.trim()).filter((u) => u.startsWith('http'))
    return urls
  }

  const rewriteMidiaUrl = (url: string): string => {
    return url.replace(/^http:\/\/147\.93\.10\.167:3084/, UPLOAD_BASE_URL)
  }

  useEffect(() => {
    if (createOpen || editOpen) {
      getAllEnderecos().then(setEnderecos).catch(() => setEnderecos([]))
    }
  }, [createOpen, editOpen])

  const openDetail = (row: Ocorrencia) => {
    setDetailRow(row)
    setDetailMidiaPage(1)
    setDetailOpen(true)
  }

  const doAction = (action: () => Promise<void>, title: string, msg: string) => {
    setConfirmAction(() => async () => {
      await action()
      setConfirmOpen(false)
      load()
    })
    setConfirmTitle(title)
    setConfirmMessage(msg)
    setConfirmOpen(true)
  }

  const openEdit = (row: Ocorrencia) => {
    setEditRow(row)
    const d = row.detalhes || {}
    setEditForm({
      telefone: row.telefone,
      nomeCliente: row.nomeCliente || '',
      enderecoCliente: row.enderecoCliente || '',
      bairroCliente: row.bairroCliente || '',
      cidadeCliente: row.cidadeCliente || 'Sorocaba',
      dataNascimentoCliente: row.dataNascimentoCliente || '',
      situacaoResumida: row.situacaoResumida,
      categoria: row.categoria,
      ehManual: row.ehManual,
      regiao: d.regiao || '',
      enderecoOcorrencia: d.enderecoOcorrencia || '',
      conheceTutor: d.conheceTutor || '',
      condicoesAnimal: d.condicoesAnimal || '',
      frequenciaMausTratos: d.frequenciaMausTratos || '',
      nomeAnimal: d.nomeAnimal || '',
      especieAnimal: d.especieAnimal || '',
      idadeAnimal: d.idadeAnimal || '',
      sexoAnimal: d.sexoAnimal || '',
      bairroAnimal: d.bairroAnimal || '',
      nomeResponsavelAnimal: d.nomeResponsavelAnimal || '',
      telefoneResponsavelAnimal: d.telefoneResponsavelAnimal || '',
      historicoAnimal: d.historicoAnimal || '',
      temCadUnico: d.temCadUnico || '',
      ehProtetorIndependente: d.ehProtetorIndependente || '',
      situacaoAnimal: d.situacaoAnimal || '',
      quandoCruzou: d.quandoCruzou || '',
      infoSaudeAnimal: d.infoSaudeAnimal || '',
      detalhesDenuncia: d.detalhesDenuncia || '',
      tempoAnimalLocal: d.tempoAnimalLocal || '',
      ferimentosAnimal: d.ferimentosAnimal || '',
      providenciasAnimal: d.providenciasAnimal || '',
      midiasAnimal: d.midiasAnimal || '',
      protocoloDenuncia: d.protocoloDenuncia || '',
    })
    setEditMensagemFinal(row.mensagemFinal || '')
    setEditObservacao(row.observacao || '')
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!editRow) return
    await updateOcorrencia(editRow.id, {
      situacaoResumida: editForm.situacaoResumida,
      categoria: editForm.categoria,
      status: editRow.status,
      enderecoOcorrencia: editForm.enderecoOcorrencia,
      conheceTutor: editForm.conheceTutor,
      condicoesAnimal: editForm.condicoesAnimal,
      frequenciaMausTratos: editForm.frequenciaMausTratos,
      nomeAnimal: editForm.nomeAnimal,
      especieAnimal: editForm.especieAnimal,
      idadeAnimal: editForm.idadeAnimal,
      sexoAnimal: editForm.sexoAnimal,
      bairroAnimal: editForm.bairroAnimal,
      nomeResponsavelAnimal: editForm.nomeResponsavelAnimal,
      telefoneResponsavelAnimal: editForm.telefoneResponsavelAnimal,
      historicoAnimal: editForm.historicoAnimal,
      temCadUnico: editForm.temCadUnico,
      ehProtetorIndependente: editForm.ehProtetorIndependente,
      situacaoAnimal: editForm.situacaoAnimal,
      quandoCruzou: editForm.quandoCruzou,
      infoSaudeAnimal: editForm.infoSaudeAnimal,
      detalhesDenuncia: editForm.detalhesDenuncia,
      tempoAnimalLocal: editForm.tempoAnimalLocal,
      ferimentosAnimal: editForm.ferimentosAnimal,
      providenciasAnimal: editForm.providenciasAnimal,
      midiasAnimal: editForm.midiasAnimal,
      protocoloDenuncia: editForm.protocoloDenuncia,
      regiao: editForm.regiao,
      mensagemFinal: editMensagemFinal,
      observacao: editObservacao,
    })
    setEditOpen(false)
    load()
  }

  const saveCreate = async () => {
    const payload = {
      ...createForm,
      telefone: normalizeTelefone(createForm.telefone),
    }
    await createOcorrencia(payload)
    setCreateOpen(false)
    setCreateForm({
      telefone: '',
      nomeCliente: '',
      enderecoCliente: '',
      bairroCliente: '',
      cidadeCliente: 'Sorocaba',
      dataNascimentoCliente: '',
      situacaoResumida: '',
      categoria: '',
      ehManual: true,
      observacao: '',
      enderecoOcorrencia: '',
      especieAnimal: '',
      idadeAnimal: '',
      sexoAnimal: '',
      bairroAnimal: '',
      nomeResponsavelAnimal: '',
      telefoneResponsavelAnimal: '',
      historicoAnimal: '',
      midiasAnimal: '',
      regiao: '',
      condicoesAnimal: '',
      frequenciaMausTratos: '',
      nomeAnimal: '',
      temCadUnico: '',
      ehProtetorIndependente: '',
      situacaoAnimal: '',
      quandoCruzou: '',
      infoSaudeAnimal: '',
      detalhesDenuncia: '',
      tempoAnimalLocal: '',
      ferimentosAnimal: '',
      providenciasAnimal: '',
      protocoloDenuncia: '',
    })
    load()
  }

  /* ── drag & drop ── */
  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('text/plain', String(id))
    e.dataTransfer.effectAllowed = 'move'
    setDraggingId(id)
  }

  const handleDragEnd = () => { setDraggingId(null); setDragOverCol(null); stopAutoScroll() }

  const handleDrop = async (e: React.DragEvent, targetCol: string) => {
    e.preventDefault()
    const id = Number(e.dataTransfer.getData('text/plain'))
    const row = rows.find((r) => r.id === id)
    if (!row) return
    const sourceCol = getColumnId(row)
    if (sourceCol === targetCol) return

    try {
      if (targetCol === 'aprovar-indicacao') {
        await aprovarInquerito(row.id)
      } else if (targetCol === 'aprovar-requerimento') {
        await aprovarRequerimento(row.id)
      } else if (targetCol === 'reprovar') {
        await reprovarInquerito(row.id)
      } else if (targetCol === 'em-analise') {
        await colocarEmAnalise(row.id)
      } else if (targetCol === 'pendentes') {
        await colocarComoCriado(row.id)
      }
      load()
    } catch (err: any) {
      console.error('Erro ao mover card:', err)
      alert(err?.response?.data?.message || err?.message || 'Erro ao mover ocorrência')
    }
    setDraggingId(null)
    setDragOverCol(null)
  }

  const cardBorderLeft: Record<string, string> = {
    pendentes: '#A1A9B8',
    'em-analise': '#62A1D8',
    'aprovar-indicacao': '#66BB80',
    'aprovar-requerimento': '#E89E70',
    reprovar: '#D16670',
  }

  const handleTelefoneChange = (value: string) => {
    const formatted = formatTelefoneInput(value)
    setCreateForm({ ...createForm, telefone: formatted })
  }

  return (
    <Box className="page-root">
      <PageHeader title="Reclamações" />

      {/* ── filter bars ── */}
      {/* group 1: date range */}
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
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          sx={{ ...inputSx, minWidth: 150 }}
        />
        <TextField
          type="date"
          size="small"
          label="Até"
          InputLabelProps={{ shrink: true }}
          inputProps={{ style: { textAlign: isMobile ? 'center' : 'left' } }}
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          sx={{ ...inputSx, minWidth: 150 }}
        />
        <Button
          size="small"
          onClick={() => {
            setDateFrom('')
            setDateTo('')
            setColumnPages({})
          }}
          sx={{ color: 'hsl(var(--text-secondary))', textTransform: 'none', borderRadius: 2, width: isMobile ? '100%' : undefined }}
        >
          Limpar Filtros
        </Button>
      </Box>

      {/* group 2: age range */}
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
          label="Idade mín"
          size="small"
          type="number"
          inputProps={{ style: { textAlign: isMobile ? 'center' : 'left' } }}
          value={ageMin}
          onChange={(e) => {
            const v = e.target.value
            setAgeMin(v)
            if (v && ageMax && parseInt(v) > parseInt(ageMax)) setAgeMax(v)
          }}
          sx={{ ...inputSx, minWidth: 110 }}
        />
        <TextField
          label="Idade máx"
          size="small"
          type="number"
          inputProps={{ style: { textAlign: isMobile ? 'center' : 'left' } }}
          value={ageMax}
          onChange={(e) => {
            const v = e.target.value
            setAgeMax(v)
            if (v && ageMin && parseInt(v) < parseInt(ageMin)) setAgeMin(v)
          }}
          sx={{ ...inputSx, minWidth: 110 }}
        />
        <Button
          size="small"
          onClick={() => {
            setAgeMin('')
            setAgeMax('')
            setColumnPages({})
          }}
          sx={{ color: 'hsl(var(--text-secondary))', textTransform: 'none', borderRadius: 2 }}
        >
          Limpar Filtros
        </Button>
      </Box>

      {/* group 3: category multi-select */}
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
        <Autocomplete
          multiple
          size="small"
          options={CATEGORIAS}
          value={catFilter}
          onChange={(_, v) => { setCatFilter(v); setColumnPages({}) }}
          getOptionLabel={(opt) => categoryDisplayName[opt] ?? opt}
          renderInput={(params) => (
            <TextField {...params} label="Categorias" size="small" sx={{ ...inputSx, minWidth: { xs: 160, sm: 400 } }} />
          )}
          sx={{ width: '100%', maxWidth: { xs: '100%', sm: 600 } }}
        />
        <Button
          size="small"
          onClick={() => {
            setCatFilter([])
            setColumnPages({})
          }}
          sx={{ color: 'hsl(var(--text-secondary))', textTransform: 'none', borderRadius: 2 }}
        >
          Limpar Filtros
        </Button>
      </Box>

      {/* group 4: search + address */}
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
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          sx={{ ...inputSx, minWidth: 220 }}
        />
        <TextField
          label="Endereço"
          size="small"
          inputProps={{ style: { textAlign: isMobile ? 'center' : 'left' } }}
          value={enderecoFilter}
          onChange={(e) => setEnderecoFilter(e.target.value)}
          sx={{ ...inputSx, minWidth: 160 }}
        />
        <TextField
          label="Bairro"
          size="small"
          inputProps={{ style: { textAlign: isMobile ? 'center' : 'left' } }}
          value={bairroFilter}
          onChange={(e) => setBairroFilter(e.target.value)}
          sx={{ ...inputSx, minWidth: 140 }}
        />
        <TextField
          label="Cidade"
          size="small"
          inputProps={{ style: { textAlign: isMobile ? 'center' : 'left' } }}
          value={cidadeFilter}
          onChange={(e) => setCidadeFilter(e.target.value)}
          sx={{ ...inputSx, minWidth: 140 }}
        />
        <Button
          size="small"
          onClick={() => {
            setSearchText('')
            setEnderecoFilter('')
            setBairroFilter('')
            setCidadeFilter('')
            setColumnPages({})
          }}
          sx={{ color: 'hsl(var(--text-secondary))', textTransform: 'none', borderRadius: 2 }}
        >
          Limpar Filtros
        </Button>
      </Box>

      {/* + Nova Reclamação button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => setCreateOpen(true)}
          sx={{
            background: 'hsl(var(--primary))',
            textTransform: 'none',
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          Nova Reclamação
        </Button>
      </Box>

      {loading ? (
        <KanbanSkeleton columns={5} />
      ) : (
      <Box
        ref={kanbanRef}
        onDragOver={(e) => { if (!isMobile) startAutoScroll(e.clientX) }}
        onDragLeave={stopAutoScroll}
        sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 2,
          overflowX: isMobile ? 'hidden' : 'auto',
          pb: 2,
          pt: 1,
          px: 0.5,
          position: 'relative',
          '&::-webkit-scrollbar': { height: 6 },
          '&::-webkit-scrollbar-thumb': { background: 'hsl(var(--border))', borderRadius: 3 },
        }}
      >
        {COLUMNS.map((col) => {
          const items = itemsForColumn(filteredRows, col.id)
          return (
            <Box
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCol(col.id) }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null) }}
              onDrop={(e) => handleDrop(e, col.id)}
              sx={{
                minWidth: isMobile ? undefined : 260,
                width: isMobile ? '100%' : undefined,
                flex: '1 1 0',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                transition: 'all 0.2s ease',
                ...(dragOverCol === col.id && draggingId !== null ? {
                  borderRadius: 2,
                  boxShadow: `0 0 0 2px ${col.color}40, 0 0 16px ${col.color}20`,
                  bgcolor: `${col.color}08`,
                } : {}),
              }}
            >
              {/* column header */}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: col.headerBg,
                  borderTop: `3px solid ${col.color}`,
                  border: '1px solid hsl(var(--border))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: col.color, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                  {col.label}
                </Typography>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: col.color,
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {items.length}
                </Box>
              </Box>

              {/* card list */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pb: 1 }}>
                {items.length === 0 && (
                  <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed hsl(var(--border))', borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                    <Inbox size={32} style={{ color: 'hsl(var(--text-secondary) / 0.3)', animation: 'empty-pulse 2.5s ease-in-out infinite' }} />
                    <Typography sx={{ color: 'hsl(var(--text-secondary) / 0.5)', fontSize: 13, fontWeight: 500 }}>
                      {col.id === 'pendentes' && 'Nenhuma reclamação pendente'}
                      {col.id === 'em-analise' && 'Nada em análise no momento'}
                      {col.id === 'aprovar-indicacao' && 'Nenhuma indicação aguardando aprovação'}
                      {col.id === 'aprovar-requerimento' && 'Nenhum requerimento aguardando aprovação'}
                      {col.id === 'reprovar' && 'Nenhuma reclamação reprovada'}
                    </Typography>
                    {(col.id === 'em-analise' || col.id === 'aprovar-indicacao' || col.id === 'aprovar-requerimento' || col.id === 'reprovar') && (
                      <Typography sx={{ color: 'hsl(var(--text-secondary) / 0.3)', fontSize: 11 }}>
                        Arraste uma reclamação aqui
                      </Typography>
                    )}
                  </Box>
                )}
                {(() => {
                  const page = columnPages[col.id] || 1
                  const start = (page - 1) * 5
                  const pageItems = items.slice(start, start + 5)
                  return pageItems.map((row) => (
                    <Box
                      key={row.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, row.id)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return
                        openDetail(row)
                      }}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'hsl(var(--surface-2))',
                        border: '1px solid hsl(var(--border))',
                        borderLeft: `3px solid ${cardBorderLeft[getColumnId(row)]}`,
                        opacity: draggingId === row.id ? 0.4 : 1,
                        transition: 'all 0.2s ease',
                        cursor: 'grab',
                        height: 360,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        '&:hover': {
                          bgcolor: 'hsl(var(--surface-2))',
                          borderColor: 'hsl(var(--primary) / 0.3)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                        },
                      }}
                    >
                      {(col.id === 'pendentes' || col.id === 'em-analise') && (() => {
                        const urgency = getUrgencyLevel(row.dataAtualizacao)
                        const diffDays = Math.floor((Date.now() - new Date(row.dataAtualizacao).getTime()) / (1000 * 60 * 60 * 24))
                        const urgencyConfig = {
                          high: { bg: '#62A1D8', text: 'Urgente' },
                          medium: { bg: '#E2AF7A', text: 'Atenção' },
                          low: { bg: '#66BB80', text: 'Recente' },
                        }[urgency]
                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 1.5, py: 0.5, mb: 1, borderRadius: 1, bgcolor: `${urgencyConfig.bg}20`, borderLeft: `3px solid ${urgencyConfig.bg}`, fontSize: 10, fontWeight: 700, color: urgencyConfig.bg, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
                            {urgencyConfig.text} · {diffDays} {diffDays === 1 ? 'dia' : 'dias'} sem update
                          </Box>
                        )
                      })()}
                      {/* top row: phone/name (left) + edit/delete (right) — fixed at top */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'hsl(var(--text-primary))', lineHeight: 1.3 }}>
                            {formatPhoneDisplay(row.telefone)}
                          </Typography>
                          {clientesMap[row.telefone]?.nome && (
                            <Typography sx={{ fontSize: 12, color: 'hsl(var(--accent))', mt: 0.3 }}>
                              {clientesMap[row.telefone].nome}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => openEdit(row)} sx={{ color: 'hsl(var(--accent))', bgcolor: 'hsl(var(--accent) / 0.12)', borderRadius: '50%', width: 28, height: 28, '&:hover': { bgcolor: 'hsl(var(--accent) / 0.2)' } }}><Pencil size={14} /></IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton size="small" onClick={() => doAction(() => deleteOcorrencia(row.id), 'Excluir Reclamação', `Confirmar exclusão #${row.id}?`)} sx={{ color: 'hsl(var(--error))', bgcolor: 'hsl(var(--error) / 0.12)', borderRadius: '50%', width: 28, height: 28, '&:hover': { bgcolor: 'hsl(var(--error) / 0.2)' } }}><Trash2 size={14} /></IconButton>
                          </Tooltip>
                        </Box>
                      </Box>

                      <Box sx={{ overflowY: 'auto', flex: 1, minHeight: 0, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-track': { background: 'transparent' }, '&::-webkit-scrollbar-thumb': { background: 'hsl(var(--border))', borderRadius: 2 } }}>
                      {/* manual badge centered below name */}
                      {row.ehManual && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0.5, mb: 0.5 }}>
                          <Box sx={{ fontSize: 10, fontWeight: 700, color: '#E89E70', bgcolor: 'hsl(var(--accent) / 0.12)', px: 1, py: 0.3, borderRadius: 1 }}>
                            Manual
                          </Box>
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 1, mb: 0.3 }}>
                        <FileText size={12} color="hsl(var(--text-secondary) / 0.5)" />
                        <Typography sx={{ fontSize: 10, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
                          Situação Resumida
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: 12, color: 'hsl(var(--text-primary))', mb: 1, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {row.situacaoResumida}
                      </Typography>

                      <Box sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.3 }}>
                          <Tag size={12} color="hsl(var(--text-secondary) / 0.5)" />
                          <Typography sx={{ fontSize: 10, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
                            Categoria
                          </Typography>
                        </Box>
                        <Box sx={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--text-primary))', bgcolor: 'hsl(var(--border))', border: '1px solid hsl(var(--border))', px: 1, py: 0.3, borderRadius: 1, display: 'inline-block' }}>
                          {categoryDisplayName[row.categoria] ?? row.categoria}
                        </Box>
                      </Box>

                      {clientesMap[row.telefone]?.dataNascimento && (
                        <Box sx={{ mb: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.3 }}>
                            <Calendar size={12} color="hsl(var(--text-secondary) / 0.5)" />
                            <Typography sx={{ fontSize: 10, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
                              Data de Nascimento
                            </Typography>
                          </Box>
                          <Typography sx={{ fontSize: 11, color: 'hsl(var(--text-primary))' }}>
                            {formatDate(clientesMap[row.telefone].dataNascimento)}
                          </Typography>
                        </Box>
                      )}

                      <Box sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.3 }}>
                          <Calendar size={12} color="hsl(var(--text-secondary) / 0.5)" />
                          <Typography sx={{ fontSize: 10, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
                            Data de Criação
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: 11, color: 'hsl(var(--text-primary))' }}>
                          {formatDate(row.dataCriacao)}
                        </Typography>
                        {(col.id === 'pendentes' || col.id === 'em-analise') && (
                          <Typography sx={{ fontSize: 10, color: 'hsl(var(--text-secondary) / 0.6)', mt: 0.3, fontStyle: 'italic' }}>
                            Atualizado {formatRelativeTime(row.dataAtualizacao)}
                          </Typography>
                        )}
                      </Box>

                      </Box>

                      {row.observacao && (
                        <Box sx={{
                          flexShrink: 0,
                          mt: 1,
                          bgcolor: 'hsl(var(--accent) / 0.08)',
                          border: '1px solid hsl(var(--accent) / 0.2)',
                          borderLeft: '3px solid hsl(var(--accent))',
                          borderRadius: 1,
                          px: 1.5,
                          py: 1,
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.3 }}>
                            <Typography sx={{ fontSize: 10, color: 'hsl(var(--accent))', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                              Observação
                            </Typography>
                          </Box>
                          <Typography sx={{ fontSize: 11, color: 'hsl(var(--text-primary))', lineHeight: 1.4, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {row.observacao}
                          </Typography>
                        </Box>
                      )}

                      {/* actions */}
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', pt: 1, borderTop: '1px solid hsl(var(--surface-2))', flexWrap: 'wrap', flexShrink: 0 }}>
                        {isMobile && col.id === 'pendentes' && (
                          <>
                            <Button size="small" startIcon={<Eye size={14} />} onClick={() => doAction(() => colocarEmAnalise(row.id), 'Enviar para Em Análise', `Confirmar envio #${row.id} para análise?`)} sx={{ flex: '1 1 calc(50% - 8px)', color: '#62A1D8', textTransform: 'none', fontSize: 11, border: '1px solid hsl(var(--info) / 0.2)', borderRadius: 1.5, px: 1.5 }}>Em Análise</Button>
                            <Button size="small" startIcon={<CheckCircle size={14} />} onClick={() => doAction(() => aprovarInquerito(row.id), 'Aprovar como Indicação', `Confirmar aprovação #${row.id}?`)} sx={{ flex: '1 1 calc(50% - 8px)', color: '#66BB80', textTransform: 'none', fontSize: 11, border: '1px solid hsl(var(--success) / 0.2)', borderRadius: 1.5, px: 1.5 }}>Indicação</Button>
                            <Button size="small" startIcon={<FileText size={14} />} onClick={() => doAction(() => aprovarRequerimento(row.id), 'Aprovar como Requerimento', `Confirmar requerimento #${row.id}?`)} sx={{ flex: '1 1 calc(50% - 8px)', color: '#E89E70', textTransform: 'none', fontSize: 11, border: '1px solid hsl(var(--accent) / 0.2)', borderRadius: 1.5, px: 1.5 }}>Requerimento</Button>
                            <Button size="small" startIcon={<XCircle size={14} />} onClick={() => doAction(() => reprovarInquerito(row.id), 'Reprovar', `Confirmar reprovação #${row.id}?`)} sx={{ flex: '1 1 calc(50% - 8px)', color: 'hsl(var(--error))', textTransform: 'none', fontSize: 11, border: '1px solid hsl(var(--error) / 0.2)', borderRadius: 1.5, px: 1.5 }}>Reprovar</Button>
                          </>
                        )}
                        {isMobile && col.id === 'em-analise' && (
                          <>
                            <Button size="small" startIcon={<CheckCircle size={14} />} onClick={() => doAction(() => aprovarInquerito(row.id), 'Aprovar como Indicação', `Confirmar aprovação #${row.id}?`)} sx={{ flex: '1 1 calc(50% - 8px)', color: '#66BB80', textTransform: 'none', fontSize: 11, border: '1px solid hsl(var(--success) / 0.2)', borderRadius: 1.5, px: 1.5 }}>Indicação</Button>
                            <Button size="small" startIcon={<FileText size={14} />} onClick={() => doAction(() => aprovarRequerimento(row.id), 'Aprovar como Requerimento', `Confirmar requerimento #${row.id}?`)} sx={{ flex: '1 1 calc(50% - 8px)', color: '#E89E70', textTransform: 'none', fontSize: 11, border: '1px solid hsl(var(--accent) / 0.2)', borderRadius: 1.5, px: 1.5 }}>Requerimento</Button>
                            <Button size="small" startIcon={<XCircle size={14} />} onClick={() => doAction(() => reprovarInquerito(row.id), 'Reprovar', `Confirmar reprovação #${row.id}?`)} sx={{ flex: '1 1 calc(50% - 8px)', color: 'hsl(var(--error))', textTransform: 'none', fontSize: 11, border: '1px solid hsl(var(--error) / 0.2)', borderRadius: 1.5, px: 1.5 }}>Reprovar</Button>
                            <Button size="small" startIcon={<ChevronLeft size={14} />} onClick={() => doAction(() => colocarComoCriado(row.id), 'Enviar para Pendentes', `Confirmar envio #${row.id} para pendentes?`)} sx={{ flex: '1 1 calc(50% - 8px)', color: '#A1A9B8', textTransform: 'none', fontSize: 11, border: '1px solid hsl(var(--text-secondary) / 0.2)', borderRadius: 1.5, px: 1.5 }}>Pendentes</Button>
                          </>
                        )}
                        {isMobile && col.id === 'aprovar-indicacao' && (
                          <>
                            <Button size="small" startIcon={<Eye size={14} />} onClick={() => doAction(() => colocarEmAnalise(row.id), 'Enviar para Em Análise', `Confirmar envio #${row.id} para análise?`)} sx={{ flex: '1 1 calc(50% - 8px)', color: '#62A1D8', textTransform: 'none', fontSize: 11, border: '1px solid hsl(var(--info) / 0.2)', borderRadius: 1.5, px: 1.5 }}>Em Análise</Button>
                            <Button size="small" startIcon={<FileText size={14} />} onClick={() => doAction(() => aprovarRequerimento(row.id), 'Aprovar como Requerimento', `Confirmar requerimento #${row.id}?`)} sx={{ flex: '1 1 calc(50% - 8px)', color: '#E89E70', textTransform: 'none', fontSize: 11, border: '1px solid hsl(var(--accent) / 0.2)', borderRadius: 1.5, px: 1.5 }}>Requerimento</Button>
                            <Button size="small" startIcon={<XCircle size={14} />} onClick={() => doAction(() => reprovarInquerito(row.id), 'Reprovar', `Confirmar reprovação #${row.id}?`)} sx={{ flex: '1 1 calc(50% - 8px)', color: 'hsl(var(--error))', textTransform: 'none', fontSize: 11, border: '1px solid hsl(var(--error) / 0.2)', borderRadius: 1.5, px: 1.5 }}>Reprovar</Button>
                            <Button size="small" startIcon={<ChevronLeft size={14} />} onClick={() => doAction(() => colocarComoCriado(row.id), 'Enviar para Pendentes', `Confirmar envio #${row.id} para pendentes?`)} sx={{ flex: '1 1 calc(50% - 8px)', color: '#A1A9B8', textTransform: 'none', fontSize: 11, border: '1px solid hsl(var(--text-secondary) / 0.2)', borderRadius: 1.5, px: 1.5 }}>Pendentes</Button>
                          </>
                        )}
                        {isMobile && col.id === 'aprovar-requerimento' && (
                          <>
                            <Button size="small" startIcon={<Eye size={14} />} onClick={() => doAction(() => colocarEmAnalise(row.id), 'Enviar para Em Análise', `Confirmar envio #${row.id} para análise?`)} sx={{ flex: '1 1 calc(50% - 8px)', color: '#62A1D8', textTransform: 'none', fontSize: 11, border: '1px solid hsl(var(--info) / 0.2)', borderRadius: 1.5, px: 1.5 }}>Em Análise</Button>
                            <Button size="small" startIcon={<CheckCircle size={14} />} onClick={() => doAction(() => aprovarInquerito(row.id), 'Aprovar como Indicação', `Confirmar aprovação #${row.id}?`)} sx={{ flex: '1 1 calc(50% - 8px)', color: '#66BB80', textTransform: 'none', fontSize: 11, border: '1px solid hsl(var(--success) / 0.2)', borderRadius: 1.5, px: 1.5 }}>Indicação</Button>
                            <Button size="small" startIcon={<XCircle size={14} />} onClick={() => doAction(() => reprovarInquerito(row.id), 'Reprovar', `Confirmar reprovação #${row.id}?`)} sx={{ flex: '1 1 calc(50% - 8px)', color: 'hsl(var(--error))', textTransform: 'none', fontSize: 11, border: '1px solid hsl(var(--error) / 0.2)', borderRadius: 1.5, px: 1.5 }}>Reprovar</Button>
                            <Button size="small" startIcon={<ChevronLeft size={14} />} onClick={() => doAction(() => colocarComoCriado(row.id), 'Enviar para Pendentes', `Confirmar envio #${row.id} para pendentes?`)} sx={{ flex: '1 1 calc(50% - 8px)', color: '#A1A9B8', textTransform: 'none', fontSize: 11, border: '1px solid hsl(var(--text-secondary) / 0.2)', borderRadius: 1.5, px: 1.5 }}>Pendentes</Button>
                          </>
                        )}
                        {isMobile && col.id === 'reprovar' && (
                          <>
                            <Button size="small" startIcon={<Eye size={14} />} onClick={() => doAction(() => colocarEmAnalise(row.id), 'Enviar para Em Análise', `Confirmar envio #${row.id} para análise?`)} sx={{ flex: '1 1 calc(50% - 8px)', color: '#62A1D8', textTransform: 'none', fontSize: 11, border: '1px solid hsl(var(--info) / 0.2)', borderRadius: 1.5, px: 1.5 }}>Em Análise</Button>
                            <Button size="small" startIcon={<CheckCircle size={14} />} onClick={() => doAction(() => aprovarInquerito(row.id), 'Aprovar como Indicação', `Confirmar aprovação #${row.id}?`)} sx={{ flex: '1 1 calc(50% - 8px)', color: '#66BB80', textTransform: 'none', fontSize: 11, border: '1px solid hsl(var(--success) / 0.2)', borderRadius: 1.5, px: 1.5 }}>Indicação</Button>
                            <Button size="small" startIcon={<FileText size={14} />} onClick={() => doAction(() => aprovarRequerimento(row.id), 'Aprovar como Requerimento', `Confirmar requerimento #${row.id}?`)} sx={{ flex: '1 1 calc(50% - 8px)', color: '#E89E70', textTransform: 'none', fontSize: 11, border: '1px solid hsl(var(--accent) / 0.2)', borderRadius: 1.5, px: 1.5 }}>Requerimento</Button>
                            <Button size="small" startIcon={<ChevronLeft size={14} />} onClick={() => doAction(() => colocarComoCriado(row.id), 'Enviar para Pendentes', `Confirmar envio #${row.id} para pendentes?`)} sx={{ flex: '1 1 calc(50% - 8px)', color: '#A1A9B8', textTransform: 'none', fontSize: 11, border: '1px solid hsl(var(--text-secondary) / 0.2)', borderRadius: 1.5, px: 1.5 }}>Pendentes</Button>
                          </>
                        )}
                      </Box>
                    </Box>
                  ))
                })()}
              </Box>

              {/* pagination */}
              {(() => {
                const totalPages = Math.ceil(items.length / 5)
                const page = columnPages[col.id] || 1
                if (totalPages <= 1) return null
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1 }}>
                    <IconButton size="small" disabled={page <= 1} onClick={() => setColumnPages({ ...columnPages, [col.id]: page - 1 })} sx={{ color: page <= 1 ? 'hsl(var(--text-secondary) / 0.3)' : 'hsl(var(--text-primary))' }}>
                      <ChevronLeft size={16} />
                    </IconButton>
                    <Typography sx={{ fontSize: 12, color: 'hsl(var(--text-secondary))' }}>
                      {page} / {totalPages}
                    </Typography>
                    <IconButton size="small" disabled={page >= totalPages} onClick={() => setColumnPages({ ...columnPages, [col.id]: page + 1 })} sx={{ color: page >= totalPages ? 'hsl(var(--text-secondary) / 0.3)' : 'hsl(var(--text-primary))' }}>
                      <ChevronRight size={16} />
                    </IconButton>
                  </Box>
                )
              })()}
            </Box>
          )
        })}
      </Box>
      )}

      {/* ── dialogs ── */}
      <ConfirmDialog open={confirmOpen} title={confirmTitle} message={confirmMessage} onConfirm={() => confirmAction?.()} onCancel={() => setConfirmOpen(false)} />

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogSx }}>
        <DialogTitle sx={{ color: 'hsl(var(--accent))', fontWeight: 700 }}>Editar Reclamação #{editRow?.id}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            select
            fullWidth
            label="Categoria"
            variant="filled"
            value={editForm.categoria}
            onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}
            sx={inputSx}
          >
            {CATEGORIAS.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {categoryDisplayName[cat] ?? cat}
              </MenuItem>
            ))}
          </TextField>
          <FormFields form={editForm} setForm={setEditForm} cat={editForm.categoria} enderecos={enderecos} onImageClick={(urls, idx) => { setLightboxUrls(urls); setLightboxIndex(idx); setLightboxOpen(true) }} onTelefoneLookup={clienteExiste} />
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Mensagem Final"
            variant="filled"
            value={editMensagemFinal}
            onChange={(e) => setEditMensagemFinal(e.target.value)}
            sx={inputSx}
          />
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Observação"
            variant="filled"
            value={editObservacao}
            onChange={(e) => setEditObservacao(e.target.value)}
            sx={inputSx}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ color: 'hsl(var(--text-secondary))', textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={saveEdit} variant="contained" sx={{ background: 'hsl(var(--primary))', textTransform: 'none', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* detail dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogSx }}>
        <DialogTitle sx={{ color: 'hsl(var(--accent))', fontWeight: 700 }}>Reclamação #{detailRow?.id}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {(() => {
            const r = detailRow
            if (!r) return null
            const c = clientesMap[r.telefone]
            return (
              <>
                {/* Dados do Cliente */}
                <Box>
                  <Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1, fontWeight: 600 }}>
                    Dados do Cliente
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <Box><Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary) / 0.6)' }}>Telefone</Typography><Typography sx={{ fontSize: 13, color: 'hsl(var(--text-primary))' }}>{formatPhoneDisplay(r.telefone)}</Typography></Box>
                    <Box><Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary) / 0.6)' }}>Nome</Typography><Typography sx={{ fontSize: 13, color: 'hsl(var(--text-primary))' }}>{r.nomeCliente || c?.nome || '-'}</Typography></Box>
                    <Box><Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary) / 0.6)' }}>Data Nasc.</Typography><Typography sx={{ fontSize: 13, color: 'hsl(var(--text-primary))' }}>{c?.dataNascimento ? formatDate(c.dataNascimento) : '-'}</Typography></Box>
                    <Box><Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary) / 0.6)' }}>Idade</Typography><Typography sx={{ fontSize: 13, color: 'hsl(var(--text-primary))' }}>{calcAge(c?.dataNascimento) !== null ? `${calcAge(c!.dataNascimento)} anos` : '-'}</Typography></Box>
                    <Box sx={{ gridColumn: '1 / -1' }}><Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary) / 0.6)' }}>Endereço</Typography><Typography sx={{ fontSize: 13, color: 'hsl(var(--text-primary))' }}>{r.enderecoCliente || c?.endereco || '-'}</Typography></Box>
                    <Box><Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary) / 0.6)' }}>Bairro</Typography><Typography sx={{ fontSize: 13, color: 'hsl(var(--text-primary))' }}>{r.bairroCliente || c?.bairro || '-'}</Typography></Box>
                    <Box><Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary) / 0.6)' }}>Cidade</Typography><Typography sx={{ fontSize: 13, color: 'hsl(var(--text-primary))' }}>{r.cidadeCliente || c?.cidade || '-'}</Typography></Box>
                  </Box>
                </Box>

                <Box sx={{ borderTop: '1px solid hsl(var(--border))', my: 0.5 }} />

                {/* Dados da Ocorrência */}
                <Box>
                  <Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1, fontWeight: 600 }}>
                    Dados da Ocorrência
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <Box><Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary) / 0.6)' }}>Categoria</Typography><Typography sx={{ fontSize: 13, color: 'hsl(var(--text-primary))' }}>{categoryDisplayName[r.categoria] ?? r.categoria}</Typography></Box>
                    <Box><Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary) / 0.6)' }}>Status</Typography><Typography sx={{ fontSize: 13, color: 'hsl(var(--text-primary))' }}>{statusDisplay[r.status.toLowerCase()] ?? r.status}</Typography></Box>
                    <Box><Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary) / 0.6)' }}>Origem</Typography><Typography sx={{ fontSize: 13, color: 'hsl(var(--text-primary))' }}>{r.ehManual ? 'Manual' : 'Chatbot'}</Typography></Box>
                    <Box><Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary) / 0.6)' }}>Região</Typography><Typography sx={{ fontSize: 13, color: 'hsl(var(--text-primary))' }}>{r.detalhes?.regiao || '-'}</Typography></Box>
                    <Box><Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary) / 0.6)' }}>Data Criação</Typography><Typography sx={{ fontSize: 13, color: 'hsl(var(--text-primary))' }}>{formatDate(r.dataCriacao)}</Typography></Box>
                    <Box><Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary) / 0.6)' }}>Data Atualização</Typography><Typography sx={{ fontSize: 13, color: 'hsl(var(--text-primary))' }}>{formatDate(r.dataAtualizacao)}</Typography></Box>
                  </Box>
                </Box>

                <Box sx={{ borderTop: '1px solid hsl(var(--border))', my: 0.5 }} />

                {/* Situação */}
                {r.situacaoResumida && (
                  <>
                    <Box>
                      <Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1, fontWeight: 600 }}>
                        Situação Resumida
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: 'hsl(var(--text-primary))', lineHeight: 1.5 }}>
                        {r.situacaoResumida}
                      </Typography>
                    </Box>
                    <Box sx={{ borderTop: '1px solid hsl(var(--border))', my: 0.5 }} />
                  </>
                )}

                {/* Mídias */}
                {r.detalhes?.midiasAnimal && (
                  <>
                    <Box sx={{ borderTop: '1px solid hsl(var(--border))', my: 0.5 }} />
                    <Box>
                      <Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1, fontWeight: 600 }}>
                        Mídias
                      </Typography>
                      {(() => {
                        const allUrls = parseMidiaUrls(r.detalhes.midiasAnimal).map((u) => rewriteMidiaUrl(u))
                        const images = allUrls.filter((u) => !u.match(/\.(mp4|webm|mov)$/i))
                        const videos = allUrls.filter((u) => u.match(/\.(mp4|webm|mov)$/i))
                        const perPage = 4
                        const totalPages = Math.max(1, Math.ceil(images.length / perPage))
                        const page = Math.min(Math.max(1, detailMidiaPage), totalPages)
                        const start = (page - 1) * perPage
                        const pageImages = images.slice(start, start + perPage)
                        return (
                          <>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                              <Box key={page} sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap', alignItems: 'flex-start', animation: 'fadeSlideIn 0.35s ease', '@keyframes fadeSlideIn': { from: { opacity: 0, transform: 'translateX(16px)' }, to: { opacity: 1, transform: 'translateX(0)' } } }}>
                                {page > 1 && (
                                  <Box sx={{ width: 36, height: 120, borderRadius: '8px 0 0 8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(270deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.45) 100%)', cursor: 'pointer', transition: 'background 0.2s', '&:hover': { background: 'linear-gradient(270deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.7) 100%)' } }} onClick={() => setDetailMidiaPage(page - 1)}>
                                    <ChevronLeft size={20} color="#fff" strokeWidth={2.5} />
                                  </Box>
                                )}
                                {pageImages.map((url, idx) => (
                                  <Box key={idx} sx={{ width: 120, height: 120, borderRadius: 1, overflow: 'hidden', border: '1px solid hsl(var(--border))', flexShrink: 0, cursor: 'pointer', transition: 'transform 0.2s ease', '&:hover': { transform: 'scale(1.04)' } }}
                                    onClick={() => { setLightboxUrls(allUrls); setLightboxIndex(allUrls.indexOf(url)); setLightboxOpen(true) }}>
                                    <img src={url} alt="midia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                                  </Box>
                                ))}
                                {page < totalPages && (
                                  <Box sx={{ width: 36, height: 120, borderRadius: '0 8px 8px 0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.45) 100%)', cursor: 'pointer', transition: 'background 0.2s', '&:hover': { background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.7) 100%)' } }} onClick={() => setDetailMidiaPage(page + 1)}>
                                    <ChevronRight size={20} color="#fff" strokeWidth={2.5} />
                                  </Box>
                                )}
                              </Box>
                              {videos.map((url, vidx) => (
                                <Box key={`v-${vidx}`} sx={{ width: 120, height: 120, borderRadius: 1, overflow: 'hidden', border: '1px solid hsl(var(--border))', flexShrink: 0, cursor: 'pointer', transition: 'transform 0.2s ease', '&:hover': { transform: 'scale(1.04)' }, position: 'relative' }}
                                  onClick={() => { setLightboxUrls(allUrls); setLightboxIndex(allUrls.indexOf(url)); setLightboxOpen(true) }}>
                                  <video src={url} muted style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.35)' }}>
                                    <Video size={28} color="#fff" />
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          </>
                        )
                      })()}
                    </Box>
                  </>
                )}

                {/* Detalhes */}
                {r.detalhes && Object.entries(r.detalhes).filter(([k, v]) => k !== 'midiasAnimal' && v && v !== '').length > 0 && (
                  <>
                    <Box sx={{ borderTop: '1px solid hsl(var(--border))', my: 0.5 }} />
                    <Box>
                      <Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1, fontWeight: 600 }}>
                        Detalhes
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                        {Object.entries(r.detalhes).filter(([k, v]) => k !== 'midiasAnimal' && k !== 'regiao' && v && v !== '').map(([k, v]) => {
                          const detailLabels: Record<string, string> = {
                            enderecoOcorrencia: 'Endereço da Ocorrência',
                            conheceTutor: 'Conhece o Tutor',
                            condicoesAnimal: 'Condições do Animal',
                            frequenciaMausTratos: 'Frequência de Maus Tratos',
                            nomeAnimal: 'Nome do Animal',
                            especieAnimal: 'Espécie',
                            idadeAnimal: 'Idade',
                            sexoAnimal: 'Sexo',
                            bairroAnimal: 'Bairro do Animal',
                            nomeResponsavelAnimal: 'Nome do Responsável',
                            telefoneResponsavelAnimal: 'Telefone do Responsável',
                            historicoAnimal: 'Histórico',
                            temCadUnico: 'Cad. Único',
                            ehProtetorIndependente: 'É Protetor Independente',
                            situacaoAnimal: 'Situação Animal',
                            quandoCruzou: 'Quando Cruzou',
                            infoSaudeAnimal: 'Info Saúde',
                            detalhesDenuncia: 'Detalhes da Denúncia',
                            tempoAnimalLocal: 'Tempo no Local',
                            ferimentosAnimal: 'Ferimentos',
                            providenciasAnimal: 'Providências',
                            protocoloDenuncia: 'Protocolo da Denúncia',
                          }
                          const valueMap: Record<string, string> = { sim: 'Sim', nao: 'Não', SIM: 'Sim', NAO: 'Não' }
                          const displayValue = valueMap[String(v)] ?? String(v)
                          return (
                            <Box key={k}>
                              <Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary) / 0.6)' }}>
                                {detailLabels[k] ?? k.replace(/([A-Z])/g, ' $1').trim()}
                              </Typography>
                              <Typography sx={{ fontSize: 13, color: 'hsl(var(--text-primary))' }}>
                                {displayValue}
                              </Typography>
                            </Box>
                          )
                        })}
                      </Box>
                    </Box>
                  </>
                )}

                {r.mensagemFinal && (
                  <>
                    <Box sx={{ borderTop: '1px solid hsl(var(--border))', my: 0.5 }} />
                    <Box>
                      <Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1, fontWeight: 600 }}>
                        Mensagem Final
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: 'hsl(var(--text-primary))', lineHeight: 1.5 }}>
                        {r.mensagemFinal}
                      </Typography>
                    </Box>
                  </>
                )}

                {r.observacao && (
                  <>
                    <Box sx={{ borderTop: '1px solid hsl(var(--border))', my: 0.5 }} />
                    <Box>
                      <Typography sx={{ fontSize: 11, color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1, fontWeight: 600 }}>
                        Observação
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: 'hsl(var(--text-primary))', lineHeight: 1.5 }}>
                        {r.observacao}
                      </Typography>
                    </Box>
                  </>
                )}
              </>
            )
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDetailOpen(false)} sx={{ color: 'hsl(var(--text-secondary))', textTransform: 'none' }}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* lightbox overlay */}
      <Dialog
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        fullScreen
        PaperProps={{
          sx: {
            bgcolor: 'rgba(0,0,0,0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          },
        }}
        sx={{ zIndex: 100000 }}
      >
        <IconButton onClick={() => setLightboxOpen(false)} sx={{ position: 'absolute', top: 16, right: 16, color: '#fff', '&:hover': { bgcolor: 'hsl(var(--surface-2))' }, zIndex: 2 }}>
          <X size={28} />
        </IconButton>

        {lightboxUrls.length > 1 && (
          <IconButton onClick={() => setLightboxIndex((i) => (i - 1 + lightboxUrls.length) % lightboxUrls.length)} sx={{ position: 'absolute', left: { xs: 4, sm: 24 }, top: '50%', transform: 'translateY(-50%)', color: '#fff', bgcolor: 'hsl(var(--surface-2))', '&:hover': { bgcolor: 'hsl(var(--text-secondary) / 0.3)' }, p: 1, zIndex: 2 }}>
            <ChevronLeft size={32} />
          </IconButton>
        )}

        {lightboxUrls.length > 1 && (
          <IconButton onClick={() => setLightboxIndex((i) => (i + 1) % lightboxUrls.length)} sx={{ position: 'absolute', right: { xs: 4, sm: 24 }, top: '50%', transform: 'translateY(-50%)', color: '#fff', bgcolor: 'hsl(var(--surface-2))', '&:hover': { bgcolor: 'hsl(var(--text-secondary) / 0.3)' }, p: 1, zIndex: 2 }}>
            <ChevronRight size={32} />
          </IconButton>
        )}

        <Box
          key={lightboxIndex}
          sx={{ maxWidth: '92vw', maxHeight: '88vh', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeScale 0.35s ease', '@keyframes fadeScale': { from: { opacity: 0, transform: 'scale(0.92)' }, to: { opacity: 1, transform: 'scale(1)' } } }}
          onTouchStart={(e) => {
            const touch = e.touches[0]
            ;(e.currentTarget as HTMLElement).dataset.touchStartX = String(touch.clientX)
          }}
          onTouchEnd={(e) => {
            if (lightboxUrls.length <= 1) return
            const el = e.currentTarget as HTMLElement
            const startX = parseFloat(el.dataset.touchStartX || '0')
            const endX = e.changedTouches[0].clientX
            const diff = startX - endX
            if (Math.abs(diff) > 50) {
              if (diff > 0) {
                setLightboxIndex((i) => (i + 1) % lightboxUrls.length)
              } else {
                setLightboxIndex((i) => (i - 1 + lightboxUrls.length) % lightboxUrls.length)
              }
            }
          }}
        >
          {(() => {
            const url = lightboxUrls[lightboxIndex]
            const isVideo = /\.(mp4|avi|mov|webm)($|\?)/i.test(url)
            return isVideo ? (
              <video src={url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '88vh', borderRadius: 8, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }} />
            ) : (
              <img src={url} alt="midia" style={{ maxWidth: '100%', maxHeight: '88vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
            )
          })()}
        </Box>

        <Typography sx={{ position: 'absolute', bottom: 24, color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 500, letterSpacing: '0.05em' }}>
          {lightboxIndex + 1} / {lightboxUrls.length}
        </Typography>
      </Dialog>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: dialogSx }}>
        <DialogTitle sx={{ color: 'hsl(var(--accent))', fontWeight: 700 }}>Nova Reclamação Manual</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField label="Telefone" fullWidth value={createForm.telefone} onChange={(e) => handleTelefoneChange(e.target.value)} variant="filled" sx={inputSx} placeholder="(XX) XXXXX-XXXX" inputProps={{ autoComplete: 'off' }} />
            {autoFilledPhone && (
              <Tooltip title="Dados do cliente preenchidos automaticamente">
                <Box sx={{ mt: 1.5, color: '#1eb859', display: 'flex', alignItems: 'center' }}>
                  <CheckCircle size={20} />
                </Box>
              </Tooltip>
            )}
          </Box>
          <TextField label="Nome do Cliente" fullWidth value={createForm.nomeCliente} onChange={(e) => setCreateForm({ ...createForm, nomeCliente: e.target.value })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />
          <Autocomplete
            fullWidth
            freeSolo
            openOnFocus
            autoHighlight
            selectOnFocus
            clearOnBlur={false}
            handleHomeEndKeys
            options={enderecos.map((e) => e.logradouro)}
            value={createForm.enderecoCliente}
            onInputChange={(_, v) => setCreateForm((prev) => ({ ...prev, enderecoCliente: v ?? '' }))}
            onChange={(_, v) => setCreateForm((prev) => ({ ...prev, enderecoCliente: v ?? '' }))}
            renderInput={(params) => <TextField {...params} label="Endereço" variant="filled" sx={inputSx} />}
            sx={{ '& .MuiAutocomplete-root': { width: '100%' } }}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Autocomplete
              fullWidth
              freeSolo
              openOnFocus
              autoHighlight
              selectOnFocus
              clearOnBlur={false}
              handleHomeEndKeys
              options={[...new Set(enderecos.map((e) => e.bairro))].sort()}
              value={createForm.bairroCliente}
              onInputChange={(_, v) => {
                setCreateForm((prev) => ({ ...prev, bairroCliente: v ?? '' }))
              }}
              onChange={(_, v) => {
                const bairro = v ?? ''
                setCreateForm((prev) => ({ ...prev, bairroCliente: bairro }))
              }}
              renderInput={(params) => <TextField {...params} label="Bairro" variant="filled" sx={inputSx} />}
            />
            <TextField label="Cidade" fullWidth value={createForm.cidadeCliente} onChange={(e) => setCreateForm({ ...createForm, cidadeCliente: e.target.value })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />
          </Box>
          <TextField label="Data de Nascimento" fullWidth type="date" value={createForm.dataNascimentoCliente} onChange={(e) => setCreateForm({ ...createForm, dataNascimentoCliente: e.target.value })} variant="filled" sx={inputSx} InputLabelProps={{ shrink: true }} inputProps={{ autoComplete: 'off' }} />

          <TextField label="Região" fullWidth value={createForm.regiao} onChange={(e) => setCreateForm({ ...createForm, regiao: e.target.value })} variant="filled" sx={inputSx} inputProps={{ autoComplete: 'off' }} />

          <FormFields form={createForm} setForm={setCreateForm} cat={createForm.categoria} enderecos={enderecos} onImageClick={(urls, idx) => { setLightboxUrls(urls); setLightboxIndex(idx); setLightboxOpen(true) }} onTelefoneLookup={clienteExiste} />
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Observação"
            variant="filled"
            value={createForm.observacao || ''}
            onChange={(e) => setCreateForm({ ...createForm, observacao: e.target.value })}
            sx={inputSx}
          />
          <TextField
            select
            fullWidth
            label="Categoria"
            variant="filled"
            value={createForm.categoria}
            onChange={(e) => setCreateForm({ ...createForm, categoria: e.target.value })}
            sx={inputSx}
          >
            {CATEGORIAS.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {categoryDisplayName[cat] ?? cat}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: 'hsl(var(--text-secondary))', textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={saveCreate} variant="contained" sx={{ background: 'hsl(var(--primary))', textTransform: 'none', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>Salvar</Button>
        </DialogActions>
      </Dialog>

    </Box>
  )
}

export default ReclamacoesPage
