import * as React from 'react'
import { useState } from 'react'
import { Box, Typography } from '@mui/material'
import InboxOutlined from '@mui/icons-material/InboxOutlined'
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
} from 'recharts'
import GlassPanel from './GlassPanel'
import { categoryDisplayName } from '../utils/categories'
import type { Stat } from '../types'

interface DistributionViewerProps {
  stats: Stat
  kanbanData: { name: string; value: number }[]
}

type Tab = 'regiao' | 'categoria' | 'tipo'

const PIE_COLORS = [
  '#223872', '#f06517', '#1eb859', '#0a84ff', '#f4a261', '#8b94a8', '#2d4a8a', '#169a4d',
  '#e63946', '#7b2cbf', '#3a86ff', '#ffbe0b', '#fb5607', '#8338ec', '#06d6a0', '#ef476f',
  '#118ab2', '#ffd166', '#073b4c', '#7209b7', '#560bad', '#f72585', '#4361ee', '#4cc9f0',
  '#80b918', '#55a630', '#2b9348', '#007f5f', '#aacc00', '#d4d700', '#e9c46a', '#e76f51',
  '#264653', '#2a9d8f', '#e07a5f', '#81b29a', '#f2cc8f', '#bc4749', '#6a994e', '#a7c957',
]

const TABS: { key: Tab; label: string }[] = [
  { key: 'regiao', label: 'Região' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'tipo', label: 'Status' },
]

interface TooltipProps {
  active?: boolean
  payload?: { name: string; value: number; payload: { percent?: number } }[]
  label?: string
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <Box sx={{ bgcolor: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 2, px: 2, py: 1.5 }}>
      <Typography variant="caption" sx={{ color: 'hsl(var(--text-secondary))', display: 'block', mb: 0.3, fontSize: 11 }}>
        {name}
      </Typography>
      <Typography variant="body2" sx={{ color: 'hsl(var(--text-primary))', fontWeight: 700, fontSize: 15 }}>
        {value} <span style={{ color: 'hsl(var(--accent))', fontWeight: 400, fontSize: 12 }}>ocorrências</span>
      </Typography>
    </Box>
  )
}


const renderCustomLegend = (items: { name: string; value: number; color: string }[]) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center', mt: 2 }}>
    {items.map((item) => (
      <Box key={item.name} display="flex" alignItems="center" gap={0.8}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
        <Typography variant="caption" sx={{ color: 'hsl(var(--text-secondary))', fontSize: 12 }}>
          {item.name}
        </Typography>
        <Typography variant="caption" sx={{ color: item.color, fontWeight: 700, fontSize: 12 }}>
          {item.value}
        </Typography>
      </Box>
    ))}
  </Box>
)

const DistributionViewer: React.FC<DistributionViewerProps> = ({ stats, kanbanData }) => {
  const [tab, setTab] = useState<Tab>('regiao')

  const regiaoData = [...stats.regioes]
    .sort((a, b) => b.qtdRegiao - a.qtdRegiao)
    .map((r, i) => ({ name: r.regiao, value: r.qtdRegiao, color: PIE_COLORS[i % PIE_COLORS.length] }))

  const categoriaData = [...stats.categorias]
    .sort((a, b) => b.qtdCategoria - a.qtdCategoria)
    .map((c) => ({ name: categoryDisplayName[c.categoria] ?? c.categoria, value: c.qtdCategoria }))

  const tipoData: { name: string; value: number }[] = kanbanData

  const activeData = tab === 'regiao' ? regiaoData : tab === 'categoria' ? categoriaData : tipoData
  const hasData = activeData.length > 0 && activeData.some((d) => d.value > 0)

  return (
    <GlassPanel className="p-5" borderRadius={14}>
      <Box display="flex" alignItems="center" flexWrap="wrap" gap={1.5} mb={3}>
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 14, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'hsl(var(--accent))', mr: 1.5 }}>
          Distribuição por:
        </Typography>
        <Box display="flex" gap={1}>
          {TABS.map((t) => (
            <Box
              key={t.key}
              onClick={() => setTab(t.key)}
              sx={{
                px: 2, py: 0.7, borderRadius: '20px', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, letterSpacing: '0.03em',
                border: `1.5px solid ${tab === t.key ? 'hsl(var(--accent))' : 'hsl(var(--border))'}`,
                bgcolor: tab === t.key ? 'hsl(var(--accent) / 0.12)' : 'transparent',
                color: tab === t.key ? 'hsl(var(--accent))' : 'hsl(var(--text-secondary))',
                transition: 'all 0.2s ease',
                '&:hover': { borderColor: 'hsl(var(--accent))', color: 'hsl(var(--accent))' },
              }}
            >
              {t.label}
            </Box>
          ))}
        </Box>
      </Box>

      {!hasData ? (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height={300} gap={1.5}>
          <InboxOutlined sx={{ fontSize: 48, color: 'hsl(var(--text-secondary) / 0.4)' }} />
          <Typography variant="body2" sx={{ color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>
            Nenhuma ocorrência encontrada
          </Typography>
          <Typography variant="caption" sx={{ color: 'hsl(var(--text-secondary) / 0.7)', textAlign: 'center', maxWidth: 280 }}>
            Não há dados de {tab === 'regiao' ? 'região' : tab === 'categoria' ? 'categoria' : 'status'} para o período selecionado.
          </Typography>
        </Box>
      ) : (
        <>
          {tab === 'regiao' && (
            <Box>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={regiaoData}
                    cx="50%"
                    cy="50%"
                    innerRadius="52%"
                    outerRadius="78%"
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {regiaoData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <ReTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {renderCustomLegend(regiaoData)}
            </Box>
          )}

          {tab === 'categoria' && (
            <Box>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoriaData}
                    cx="50%"
                    cy="50%"
                    innerRadius="52%"
                    outerRadius="78%"
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoriaData.map((entry, i) => (
                      <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {renderCustomLegend(categoriaData.map((c, i) => ({ ...c, color: PIE_COLORS[i % PIE_COLORS.length] })))}
            </Box>
          )}

          {tab === 'tipo' && (
            <Box>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={tipoData}
                    cx="50%"
                    cy="50%"
                    innerRadius="52%"
                    outerRadius="78%"
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {tipoData.map((entry, i) => (
                      <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {renderCustomLegend(tipoData.map((t, i) => ({ ...t, color: PIE_COLORS[i % PIE_COLORS.length] })))}
            </Box>
          )}
        </>
      )}
    </GlassPanel>
  )
}

export default DistributionViewer
