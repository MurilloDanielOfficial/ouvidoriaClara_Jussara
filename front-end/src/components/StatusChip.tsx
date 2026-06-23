import * as React from 'react'
import { Chip } from '@mui/material'

const statusColors: Record<string, { bg: string; color: string; border: string }> = {
  'em análise': { bg: 'hsl(var(--info) / 0.15)', color: 'hsl(var(--info))', border: '1px solid hsl(var(--info) / 0.3)' },
  'aprovado': { bg: 'hsl(var(--success) / 0.15)', color: 'hsl(var(--success))', border: '1px solid hsl(var(--success) / 0.3)' },
  'reprovado': { bg: 'hsl(var(--error) / 0.15)', color: 'hsl(var(--error))', border: '1px solid hsl(var(--error) / 0.3)' },
  'protocolada': { bg: 'hsl(var(--info) / 0.15)', color: 'hsl(var(--info))', border: '1px solid hsl(var(--info) / 0.3)' },
  'resolvido': { bg: 'hsl(var(--success) / 0.15)', color: 'hsl(var(--success))', border: '1px solid hsl(var(--success) / 0.3)' },
}

const tipoColors: Record<string, { bg: string; color: string; border: string }> = {
  'inquerito': { bg: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--accent))', border: '1px solid hsl(var(--primary) / 0.3)' },
  'requerimento': { bg: 'hsl(var(--accent) / 0.15)', color: 'hsl(var(--accent))', border: '1px solid hsl(var(--accent) / 0.3)' },
  'indicreq': { bg: 'hsl(var(--info) / 0.15)', color: 'hsl(var(--info))', border: '1px solid hsl(var(--info) / 0.3)' },
}

export const statusDisplay: Record<string, string> = {
  'criado': 'Criado',
  'em análise': 'Em Análise',
  'aprovado': 'Aprovado',
  'reprovado': 'Reprovado',
  'protocolada': 'Protocolada',
  'resolvido': 'Resolvido',
}

const tipoDisplay: Record<string, string> = {
  'inquerito': 'Inquérito',
  'requerimento': 'Requerimento',
  'indicreq': 'Indicação/Requerimento',
}

interface StatusChipProps {
  value: string
  variant?: 'status' | 'tipo'
}

const StatusChip: React.FC<StatusChipProps> = ({ value, variant = 'status' }) => {
  const map = variant === 'tipo' ? tipoColors : statusColors
  const displayMap = variant === 'tipo' ? tipoDisplay : statusDisplay
  const style = map[value.toLowerCase()] || { bg: 'hsl(var(--surface-2))', color: 'hsl(var(--text-secondary))', border: '1px solid hsl(var(--border))' }
  const label = displayMap[value.toLowerCase()] ?? value
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        bgcolor: style.bg,
        color: style.color,
        border: style.border,
        fontWeight: 600,
        fontSize: '0.75rem',
      }}
    />
  )
}

export default StatusChip
