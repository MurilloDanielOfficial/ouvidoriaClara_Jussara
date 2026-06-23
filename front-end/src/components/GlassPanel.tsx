import * as React from 'react'

interface GlassPanelProps {
  children: React.ReactNode
  className?: string
  borderRadius?: number
  noBorder?: boolean
  style?: React.CSSProperties
}

const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className = '',
  borderRadius = 12,
  noBorder = false,
  style,
}) => (
  <div
    className={className}
    style={{
      borderRadius,
      background: 'hsl(var(--surface))',
      border: noBorder ? 'none' : '1px solid hsl(var(--border))',
      boxShadow: noBorder ? 'none' : '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
      ...style,
    }}
  >
    {children}
  </div>
)

export default GlassPanel
