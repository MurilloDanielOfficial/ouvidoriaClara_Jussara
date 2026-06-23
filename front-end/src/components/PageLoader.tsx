import * as React from 'react'
import { Box, Typography } from '@mui/material'

const PageLoader: React.FC<{ message?: string }> = ({ message = 'Carregando...' }) => (
  <Box
    className="page-root"
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: 2,
    }}
  >
    <Box sx={{ position: 'relative', width: 56, height: 56 }}>
      {/* Outer ring */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '3px solid hsl(var(--border))',
          borderTopColor: 'hsl(var(--accent))',
          animation: 'page-loader-spin 0.8s linear infinite',
        }}
      />
      {/* Inner pulsing dot */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 10,
          height: 10,
          borderRadius: '50%',
          bgcolor: 'hsl(var(--accent))',
          animation: 'page-loader-pulse 1.2s ease-in-out infinite',
        }}
      />
    </Box>
    <Typography
      sx={{
        color: 'hsl(var(--text-secondary))',
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: '0.04em',
        animation: 'page-loader-fade 0.6s ease 0.2s both',
      }}
    >
      {message}
    </Typography>
  </Box>
)

export default PageLoader
