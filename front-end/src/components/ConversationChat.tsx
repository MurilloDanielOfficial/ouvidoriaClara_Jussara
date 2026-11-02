import * as React from 'react'
import { Box, Typography, CircularProgress, Alert, TextField, IconButton, Chip, Button } from '@mui/material'
import { MessageCircle, AlertCircle, Send, Power, Clock, FileText } from 'lucide-react'
import ChatBubble from './ChatBubble'
import ConfirmDialog from './ConfirmDialog'
import {
  getHistoricoChat,
  enviarMensagemAgente,
  enviarTemplateRetomada,
  getIaLigada,
  religarIa,
} from '../services/difyService'
import { ApiError } from '../utils/api'
import { formatPhoneDisplay } from '../utils/phone'
import { isNA } from '../utils/display'
import type { ConversaResumo, MensagemChat, JanelaAtendimento } from '../types'

// "5h 12min" / "38min"
function formatRestante(segundos: number): string {
  const totalMin = Math.max(0, Math.floor(segundos / 60))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}min`
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

interface ConversationChatProps {
  conversa: ConversaResumo | null
  onMessageSent?: () => void
  clientesMap?: Map<string, string>
}

const POLL_INTERVAL = 8000 // 8s

const ConversationChat: React.FC<ConversationChatProps> = ({ conversa, onMessageSent, clientesMap }) => {
  const [messages, setMessages] = React.useState<MensagemChat[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [inputValue, setInputValue] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [iaLigada, setIaLigada] = React.useState<boolean | null>(null)
  const [togglingIa, setTogglingIa] = React.useState(false)
  const [janela, setJanela] = React.useState<JanelaAtendimento | null>(null)
  const [sendError, setSendError] = React.useState<string | null>(null)
  const [confirmTemplate, setConfirmTemplate] = React.useState(false)
  const [sendingTemplate, setSendingTemplate] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const abortRef = React.useRef<AbortController | null>(null)

  // Carrega mensagens + status da IA quando a conversa muda + polling
  React.useEffect(() => {
    if (!conversa || !conversa.telefone) {
      setMessages([])
      setError(null)
      setIaLigada(null)
      setJanela(null)
      return
    }
    setJanela(null)
    setSendError(null)
    setInputValue('')

    let cancelled = false
    let pollTimer: ReturnType<typeof setTimeout> | null = null

    const loadMessages = async () => {
      if (abortRef.current) {
        abortRef.current.abort()
      }
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const data = await getHistoricoChat(conversa.telefone, controller.signal)
        if (cancelled) return
        setMessages(data.mensagens || [])
        setJanela(data.janela ?? null)
        setError(null)
      } catch (err) {
        if (cancelled || (err as Error).name === 'AbortError') return
        setError((err as Error).message || 'Erro ao carregar mensagens')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const loadIaStatus = async () => {
      try {
        const ligada = await getIaLigada(conversa.telefone)
        if (cancelled) return
        setIaLigada(ligada)
      } catch {
        if (!cancelled) setIaLigada(null)
      }
    }

    setLoading(true)
    loadMessages()
    loadIaStatus()

    // Polling a cada 8s
    const startPolling = () => {
      pollTimer = setTimeout(async () => {
        if (cancelled) return
        await Promise.all([loadMessages(), loadIaStatus()])
        if (!cancelled) startPolling()
      }, POLL_INTERVAL)
    }
    startPolling()

    return () => {
      cancelled = true
      if (pollTimer) clearTimeout(pollTimer)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [conversa])

  // Auto-scroll para o final quando mensagens chegam
  const prevMsgCountRef = React.useRef(0)
  const prevTelRef = React.useRef<string | null>(null)
  React.useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const isConvChanged = prevTelRef.current !== conversa?.telefone
    prevTelRef.current = conversa?.telefone ?? null

    // Primeira carga de mensagens (refresh ou troca de conversa) — sempre vai para o final
    if (isConvChanged || (prevMsgCountRef.current === 0 && messages.length > 0)) {
      el.scrollTop = el.scrollHeight
      prevMsgCountRef.current = messages.length
      return
    }

    if (messages.length > prevMsgCountRef.current) {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      if (distFromBottom < 150) {
        el.scrollTop = el.scrollHeight
      }
    }
    prevMsgCountRef.current = messages.length
  }, [messages, conversa?.telefone])

  // Enviar mensagem do agente
  const handleSend = async () => {
    const conteudo = inputValue.trim()
    if (!conteudo || !conversa || sending) return

    setSending(true)
    setSendError(null)
    try {
      const novaMensagem = await enviarMensagemAgente(conversa.telefone, conteudo)
      // Adiciona a mensagem otimisticamente na lista
      setMessages((prev) => [...prev, novaMensagem])
      setInputValue('')
      // O envio desliga a IA automaticamente
      setIaLigada(false)
      // Notifica o parent para recarregar a lista de conversas
      onMessageSent?.()
      // Scroll para o bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      }, 50)
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err)
      if (err instanceof ApiError && err.status === 409) {
        // janela fechou entre o último polling e o envio: o texto fica no campo
        setJanela({ aberta: false, segundosRestantes: 0 })
      } else {
        setSendError('Não foi possível enviar: ' + (err as Error).message)
      }
    } finally {
      setSending(false)
    }
  }

  // Enviar a mensagem modelo (janela de 24h fechada)
  const handleSendTemplate = async () => {
    setConfirmTemplate(false)
    if (!conversa || sendingTemplate) return
    setSendingTemplate(true)
    setSendError(null)
    try {
      const novaMensagem = await enviarTemplateRetomada(conversa.telefone)
      setMessages((prev) => [...prev, novaMensagem])
      setIaLigada(false)
      onMessageSent?.()
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }, 50)
    } catch (err) {
      console.error('Erro ao enviar mensagem modelo:', err)
      setSendError('Não foi possível enviar a mensagem modelo: ' + (err as Error).message)
    } finally {
      setSendingTemplate(false)
    }
  }

  // Modelo já enviado e o cidadão ainda não respondeu?
  const ultimaMsg = messages[messages.length - 1]
  const aguardandoResposta =
    !!ultimaMsg && ultimaMsg.remetente === 'agente' && ultimaMsg.conteudo.startsWith('📋')

  // Religar a IA
  const handleReligarIa = async () => {
    if (!conversa || togglingIa) return
    setTogglingIa(true)
    try {
      await religarIa(conversa.telefone)
      setIaLigada(true)
    } catch (err) {
      console.error('Erro ao religar IA:', err)
      setError('Erro ao religar IA: ' + (err as Error).message)
    } finally {
      setTogglingIa(false)
    }
  }

  // Empty state — nenhuma conversa selecionada
  if (!conversa) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'hsl(var(--background))',
          color: 'hsl(var(--text-secondary))',
        }}
      >
        <MessageCircle size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
        <Typography sx={{ fontSize: 15 }}>Selecione uma conversa para visualizar</Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'hsl(var(--chat-bg))',
        minHeight: 0,
      }}
    >
      <ChatHeader
        conversa={conversa}
        iaLigada={iaLigada}
        onReligarIa={handleReligarIa}
        togglingIa={togglingIa}
        clientesMap={clientesMap}
      />

      {/* Área de mensagens */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
          py: 1.5,
        }}
      >
        <Box>
        {loading && messages.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} sx={{ color: 'hsl(var(--accent))' }} />
          </Box>
        ) : error ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <Alert
              severity="error"
              icon={<AlertCircle size={18} />}
              sx={{
                bgcolor: 'hsl(var(--error) / 0.1)',
                color: 'hsl(var(--text-primary))',
                '& .MuiAlert-icon': { color: 'hsl(var(--error))' },
                maxWidth: 500,
              }}
            >
              {error}
            </Alert>
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
            <MessageCircle size={36} color="hsl(var(--text-secondary))" style={{ opacity: 0.4, marginBottom: 12 }} />
            <Typography sx={{ fontSize: 14, color: 'hsl(var(--text-secondary))' }}>
              Nenhuma mensagem encontrada nesta conversa.
            </Typography>
          </Box>
        ) : (
          messages.map((msg) => <ChatBubble key={msg.id} message={msg} />)
        )}
        </Box>
      </Box>

      {sendError && (
        <Alert
          severity="error"
          onClose={() => setSendError(null)}
          sx={{ borderRadius: 0, flexShrink: 0, fontSize: 13 }}
        >
          {sendError}
        </Alert>
      )}

      {/* Janela de 24h fechada: só mensagem modelo (regra da Meta) */}
      {janela && !janela.aberta ? (
        <Box
          sx={{
            p: 1.5,
            borderTop: '1px solid hsl(var(--border))',
            bgcolor: 'hsl(var(--surface))',
            display: 'flex',
            gap: 1.5,
            alignItems: 'center',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <Clock size={18} color="hsl(var(--warning))" style={{ flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
              {aguardandoResposta ? 'Mensagem modelo enviada' : 'Janela de 24h fechada'}
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'hsl(var(--text-secondary))', lineHeight: 1.4 }}>
              {aguardandoResposta
                ? 'Assim que o cidadão responder, o campo de texto volta a funcionar.'
                : 'O cidadão não fala com a gente há mais de 24h. Pelas regras do WhatsApp, só dá para enviar a mensagem modelo aprovada. Quando ele responder, a conversa reabre.'}
            </Typography>
          </Box>
          {!aguardandoResposta && (
            <Button
              variant="contained"
              size="small"
              disabled={sendingTemplate}
              onClick={() => setConfirmTemplate(true)}
              startIcon={sendingTemplate ? <CircularProgress size={14} /> : <FileText size={16} />}
              sx={{
                bgcolor: 'hsl(var(--accent))',
                '&:hover': { bgcolor: 'hsl(var(--accent-hover))' },
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
              }}
            >
              Enviar mensagem modelo
            </Button>
          )}
        </Box>
      ) : (
      <Box sx={{ flexShrink: 0, borderTop: '1px solid hsl(var(--border))', bgcolor: 'hsl(var(--surface))' }}>
      {janela?.aberta && (
        <Typography sx={{ px: 1.75, pt: 1, fontSize: 12, color: 'hsl(var(--text-secondary))' }}>
          Janela aberta · fecha em {formatRestante(janela.segundosRestantes)} · enviar desliga a Ju nesta conversa
        </Typography>
      )}
      <Box
        sx={{
          p: 1.5,
          display: 'flex',
          gap: 1,
          alignItems: 'flex-end',
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          size="small"
          placeholder="Digite uma mensagem..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'hsl(var(--surface-2))',
              borderRadius: 2,
              '& fieldset': { borderColor: 'hsl(var(--border))' },
              '&:hover fieldset': { borderColor: 'hsl(var(--accent))' },
              '&.Mui-focused fieldset': { borderColor: 'hsl(var(--accent))' },
            },
            '& textarea': { color: 'hsl(var(--text-primary))', fontSize: 15, lineHeight: 1.4 },
          }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!inputValue.trim() || sending}
          sx={{
            bgcolor: inputValue.trim() && !sending ? 'hsl(var(--accent))' : 'hsl(var(--surface-2))',
            color: inputValue.trim() && !sending ? '#fff' : 'hsl(var(--text-secondary))',
            '&:hover': { bgcolor: 'hsl(var(--accent-hover))' },
            '&.Mui-disabled': { bgcolor: 'hsl(var(--surface-2))' },
            borderRadius: 2,
            p: 1,
          }}
        >
          {sending ? <CircularProgress size={18} /> : <Send size={18} />}
        </IconButton>
      </Box>
      </Box>
      )}

      <ConfirmDialog
        open={confirmTemplate}
        title="Enviar mensagem modelo?"
        message="O WhatsApp cobra por mensagem modelo enviada fora da janela de 24h. Ela convida o cidadão a responder; quando ele responder, você volta a conversar normalmente. A Ju fica desligada nesta conversa."
        confirmLabel="Enviar"
        onConfirm={handleSendTemplate}
        onCancel={() => setConfirmTemplate(false)}
      />
    </Box>
  )
}

interface ChatHeaderProps {
  conversa: ConversaResumo
  iaLigada: boolean | null
  onReligarIa: () => void
  togglingIa: boolean
  clientesMap?: Map<string, string>
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ conversa, iaLigada, onReligarIa, togglingIa, clientesMap }) => {
  // Nome: tabela cliente > nome do backend > vazio (mostra só telefone)
  // Nome: tabela cliente > nome do backend > vazio (mostra só telefone)
  // O backend pode retornar "?" quando o nome não existe — tratamos como vazio
  const isNomeValido = (n: string | undefined | null): boolean =>
    !!n && n.trim() !== '' && n.trim() !== '?' && n.trim() !== 'null' && !isNA(n)
  const nomeCliente = clientesMap?.get(conversa.telefone)
  const nome = isNomeValido(nomeCliente) ? nomeCliente! : isNomeValido(conversa.nome) ? conversa.nome : ''
  return (
  <Box
    sx={{
      px: 2,
      py: 1.5,
      borderBottom: '1px solid hsl(var(--border))',
      bgcolor: 'hsl(var(--surface))',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 1,
    }}
  >
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Typography
        sx={{
          fontSize: 15,
          fontWeight: 600,
          color: 'hsl(var(--text-primary))',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {nome || formatPhoneDisplay(conversa.telefone)}
      </Typography>
      {nome && (
        <Typography sx={{ fontSize: 13, color: 'hsl(var(--text-secondary))' }}>
          {formatPhoneDisplay(conversa.telefone)}
        </Typography>
      )}
    </Box>

    {/* Status da IA + botão religar */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
      {iaLigada === null ? (
        <Chip
          size="small"
          label="Ju: ..."
          sx={{
            fontSize: 12,
            height: 26,
            bgcolor: 'hsl(var(--surface-2))',
            color: 'hsl(var(--text-secondary))',
          }}
        />
      ) : iaLigada ? (
        <Chip
          size="small"
          label="Ju ligada"
          sx={{
            fontSize: 12,
            height: 26,
            bgcolor: 'hsl(var(--success) / 0.15)',
            color: 'hsl(var(--success))',
          }}
        />
      ) : (
        <>
          <Chip
            size="small"
            label="Ju desligada"
            sx={{
              fontSize: 12,
              height: 26,
              bgcolor: 'hsl(var(--warning) / 0.15)',
              color: 'hsl(var(--warning))',
            }}
          />
          <IconButton
            onClick={onReligarIa}
            disabled={togglingIa}
            size="small"
            title="Religar Ju"
            sx={{
              bgcolor: 'hsl(var(--success) / 0.15)',
              color: 'hsl(var(--success))',
              '&:hover': { bgcolor: 'hsl(var(--success) / 0.25)' },
              p: 0.75,
            }}
          >
            {togglingIa ? <CircularProgress size={14} /> : <Power size={15} />}
          </IconButton>
        </>
      )}
    </Box>
  </Box>
  )
}

export default ConversationChat
