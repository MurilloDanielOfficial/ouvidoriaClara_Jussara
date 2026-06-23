import type { SxProps, Theme } from '@mui/material/styles'

export const inputSx: SxProps<Theme> = {
  '& .MuiFilledInput-root': {
    background: 'hsl(var(--surface-2))',
    borderRadius: '8px 8px 0 0',
    '&:hover': { background: 'hsl(var(--surface-2))', filter: 'brightness(1.05)' },
    '&.Mui-focused': { background: 'hsl(var(--surface-2))' },
  },
  '& .MuiFilledInput-input': {
    color: 'hsl(var(--text-primary))',
  },
  '& .MuiInputLabel-root': {
    color: 'hsl(var(--text-secondary))',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: 'hsl(var(--accent))',
  },
  '& .MuiFilledInput-underline:after': {
    borderBottomColor: 'hsl(var(--accent))',
  },
}

export const dialogSx = {
  bgcolor: 'hsl(var(--surface-2))',
  color: 'hsl(var(--text-primary))',
  borderRadius: 3,
  border: '1px solid hsl(var(--border))',
  boxShadow: '0 24px 70px rgba(0,0,0,0.5)',
  backgroundImage: 'linear-gradient(180deg, hsl(var(--surface) / 0.4) 0%, hsl(var(--surface-2)) 100%)',
}
