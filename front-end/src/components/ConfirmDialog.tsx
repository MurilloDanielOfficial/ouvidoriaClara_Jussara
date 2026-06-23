import * as React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  destructive?: boolean
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  destructive = false,
}) => (
  <Dialog open={open} onClose={onCancel} PaperProps={{ sx: { bgcolor: 'hsl(var(--surface))', color: 'hsl(var(--text-primary))', borderRadius: 3, border: '1px solid hsl(var(--border))' } }}>
    <DialogTitle sx={{ color: 'hsl(var(--accent))', fontWeight: 700 }}>{title}</DialogTitle>
    <DialogContent>
      <DialogContentText sx={{ color: 'hsl(var(--text-secondary))' }}>{message}</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} sx={{ color: 'hsl(var(--text-secondary))' }}>{cancelLabel}</Button>
      <Button onClick={onConfirm} color={destructive ? 'error' : 'primary'} variant="contained">
        {confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
)

export default ConfirmDialog
