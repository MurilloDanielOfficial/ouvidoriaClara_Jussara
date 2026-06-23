import * as React from 'react'
import { Box, Typography } from '@mui/material'

interface PageHeaderProps {
  title: string
  action?: React.ReactNode
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, action }) => (
  <Box
    display="flex"
    alignItems="center"
    justifyContent="center"
    mb={3}
    pb={1.5}
    sx={{
      borderBottom: '2px solid hsl(var(--primary))',
    }}
  >
    <Typography
      variant="h5"
      sx={{
        color: 'hsl(var(--text-primary))',
        fontWeight: 700,
        fontFamily: "'Inter', sans-serif",
        letterSpacing: '-0.01em',
        textAlign: 'center',
      }}
    >
      {title}
    </Typography>
    {action && <Box>{action}</Box>}
  </Box>
)

export default PageHeader
