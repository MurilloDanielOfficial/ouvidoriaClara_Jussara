import * as React from 'react'
import { Box, Typography } from '@mui/material'

/* Título de seção: marcador accent + label uppercase + hairline. */
const SectionTitle: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({ children, action }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5, mt: 3 }}>
    <Box
      aria-hidden="true"
      sx={{
        width: 3,
        height: 16,
        borderRadius: 2,
        background: 'linear-gradient(180deg, hsl(var(--accent)), hsl(var(--accent) / 0.4))',
        flexShrink: 0,
      }}
    />
    <Typography
      component="h2"
      sx={{
        color: 'hsl(var(--text-primary))',
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Typography>
    <Box aria-hidden="true" sx={{ flex: 1, height: 1, bgcolor: 'hsl(var(--border) / 0.6)' }} />
    {action}
  </Box>
)

export default SectionTitle
