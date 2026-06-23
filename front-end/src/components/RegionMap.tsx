import * as React from 'react'
import { useState } from 'react'
import { Box, Typography } from '@mui/material'
import type { StatsRegiao } from '../types'

interface RegionMapProps {
  regioes: StatsRegiao[]
}

const REGION_SHAPES: Record<string, { path: string; labelX: number; labelY: number }> = {
  'Zona Norte': {
    path: 'M 130,10 L 270,10 L 290,55 L 250,80 L 200,90 L 150,80 L 110,55 Z',
    labelX: 200,
    labelY: 52,
  },
  'Centro': {
    path: 'M 150,95 L 250,95 L 275,150 L 250,205 L 150,205 L 125,150 Z',
    labelX: 200,
    labelY: 150,
  },
  'Zona Oeste': {
    path: 'M 30,100 L 120,85 L 120,215 L 30,230 Z',
    labelX: 75,
    labelY: 158,
  },
  'Zona Sul': {
    path: 'M 130,210 L 270,210 L 300,260 L 260,310 L 200,330 L 140,310 L 100,260 Z',
    labelX: 200,
    labelY: 268,
  },
}

const NAVY = '#223872'

function hexToOpacity(count: number, max: number): number {
  if (max === 0) return 0.08
  return 0.1 + (count / max) * 0.75
}

const RegionMap: React.FC<RegionMapProps> = ({ regioes }) => {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)

  const maxCount = Math.max(...regioes.map((r) => r.qtdRegiao), 1)
  const countMap = Object.fromEntries(regioes.map((r) => [r.regiao, r.qtdRegiao]))

  const knownRegions = new Set(Object.keys(REGION_SHAPES))
  const unknownRegions = regioes.filter((r) => !knownRegions.has(r.regiao))

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: 'flex-start' }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <svg
          viewBox="0 0 340 345"
          width="100%"
          style={{ maxWidth: 420, display: 'block', margin: '0 auto' }}
          preserveAspectRatio="xMidYMid meet"
        >

          {Object.entries(REGION_SHAPES).map(([name, shape]) => {
            const count = countMap[name] ?? 0
            const opacity = hexToOpacity(count, maxCount)
            const isHovered = hoveredRegion === name
            return (
              <g
                key={name}
                onMouseEnter={() => setHoveredRegion(name)}
                onMouseLeave={() => setHoveredRegion(null)}
                style={{ cursor: 'pointer' }}
              >
                <path
                  d={shape.path}
                  fill={`rgba(34,56,114,${opacity})`}
                  stroke={isHovered ? NAVY : 'rgba(34,56,114,0.4)'}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  style={{ transition: 'all 0.2s ease' }}
                />
                <text
                  x={shape.labelX}
                  y={shape.labelY - 8}
                  textAnchor="middle"
                  fill={isHovered ? '#fff' : 'hsl(var(--text-secondary))'}
                  fontSize={isHovered ? 13 : 12}
                  fontWeight={isHovered ? '700' : '500'}
                  fontFamily="inherit"
                  style={{ pointerEvents: 'none', transition: 'all 0.2s ease' }}
                >
                  {name}
                </text>
                <text
                  x={shape.labelX}
                  y={shape.labelY + 10}
                  textAnchor="middle"
                  fill={isHovered ? NAVY : 'rgba(34,56,114,0.8)'}
                  fontSize={isHovered ? 16 : 14}
                  fontWeight="700"
                  fontFamily="inherit"
                  style={{ pointerEvents: 'none', transition: 'all 0.2s ease' }}
                >
                  {count}
                </text>
              </g>
            )
          })}

          {unknownRegions.map((r, i) => {
            const x = 10 + (i % 2) * 80
            const y = 355 + Math.floor(i / 2) * 50
            const opacity = hexToOpacity(r.qtdRegiao, maxCount)
            const isHovered = hoveredRegion === r.regiao
            return (
              <g
                key={r.regiao}
                onMouseEnter={() => setHoveredRegion(r.regiao)}
                onMouseLeave={() => setHoveredRegion(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={x} y={y} width={72} height={40} rx={8}
                  fill={`rgba(34,56,114,${opacity})`}
                  stroke={isHovered ? NAVY : 'rgba(34,56,114,0.4)'}
                  strokeWidth={isHovered ? 2 : 1.5}
                />
                <text x={x + 36} y={y + 14} textAnchor="middle" fill="hsl(var(--text-secondary))" fontSize={9} fontFamily="inherit">
                  {r.regiao}
                </text>
                <text x={x + 36} y={y + 30} textAnchor="middle" fill={NAVY} fontSize={13} fontWeight="700" fontFamily="inherit">
                  {r.qtdRegiao}
                </text>
              </g>
            )
          })}
        </svg>
      </Box>

      <Box sx={{ minWidth: 160, display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
        <Typography variant="caption" sx={{ color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, mb: 0.5 }}>
          Legenda
        </Typography>
        {regioes
          .slice()
          .sort((a, b) => b.qtdRegiao - a.qtdRegiao)
          .map((r) => {
            const pct = maxCount > 0 ? (r.qtdRegiao / maxCount) * 100 : 0
            const isHovered = hoveredRegion === r.regiao
            return (
              <Box
                key={r.regiao}
                onMouseEnter={() => setHoveredRegion(r.regiao)}
                onMouseLeave={() => setHoveredRegion(null)}
                sx={{ cursor: 'pointer', p: 1.5, borderRadius: 2, border: `1px solid ${isHovered ? NAVY : 'hsl(var(--border))'}`, bgcolor: isHovered ? 'hsl(var(--primary) / 0.08)' : 'hsl(var(--surface-2))', transition: 'all 0.2s ease' }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="caption" sx={{ color: isHovered ? '#fff' : 'hsl(var(--text-secondary))', fontWeight: 600, fontSize: 11 }}>
                    {r.regiao}
                  </Typography>
                  <Typography variant="caption" sx={{ color: NAVY, fontWeight: 700, fontSize: 12 }}>
                    {r.qtdRegiao}
                  </Typography>
                </Box>
                <Box sx={{ height: 3, borderRadius: 2, bgcolor: 'hsl(var(--border))', overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: NAVY, borderRadius: 2, transition: 'width 0.6s ease' }} />
                </Box>
              </Box>
            )
          })}
      </Box>
    </Box>
  )
}

export default RegionMap
