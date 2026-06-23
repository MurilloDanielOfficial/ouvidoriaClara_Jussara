import * as React from 'react'
import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Phone,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { getTheme, toggleTheme } from '../utils/theme'
import { clearSession } from '../utils/session'
import type { Theme } from '../utils/theme'

const navItems = [
  { to: '/', icon: FileText, label: 'Reclamações' },
  { to: '/contatos', icon: Phone, label: 'Contatos' },
  { to: '/estatisticas', icon: LayoutDashboard, label: 'Estatísticas' },
]

const NAVBAR_HEIGHT = 64

const Navbar: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [theme, setThemeState] = useState<Theme>(getTheme())
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const body = document.body
    body.classList.add('theme-transition')
    if (theme === 'dark') body.classList.remove('theme-light')
    else body.classList.add('theme-light')
    setTimeout(() => body.classList.remove('theme-transition'), 300)
  }, [theme])

  const isDark = theme === 'dark'

  const bg = isDark ? 'hsl(var(--surface))' : 'hsl(var(--surface))'
  const textColor = 'hsl(var(--text-secondary))'
  const activeText = '#fff'
  const activeBg = 'hsl(var(--primary))'
  const hoverBg = 'hsl(var(--surface-2))'
  const dividerColor = 'hsl(var(--border))'
  const shadow = isDark
    ? '0 1px 3px rgba(0,0,0,0.3)'
    : '0 1px 3px rgba(0,0,0,0.08)'

  const handleToggleTheme = () => {
    const next = toggleTheme()
    setThemeState(next)
  }

  const handleLogout = () => {
    clearSession()
    navigate('/login')
  }

  return (
    <>
      {/* ── Main topbar ── */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: NAVBAR_HEIGHT,
        background: bg,
        boxShadow: shadow,
        borderBottom: `1px solid ${dividerColor}`,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 24,
        paddingRight: 24,
        gap: 0,
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* Logo block */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          paddingRight: 24,
          borderRight: `1px solid ${dividerColor}`,
          flexShrink: 0,
        }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{
              height: 36,
              width: 'auto',
              objectFit: 'contain',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <span style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'hsl(var(--accent))',
              letterSpacing: '0.02em',
            }}>
              Ouvidoria
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 500,
              color: textColor,
              letterSpacing: '0.04em',
            }}>
              Jussara
            </span>
          </div>
        </div>

        {/* Nav links — desktop (viewport-centered, ignores logo + actions) */}
        <div style={{
          display: 'none',
          alignItems: 'center',
          gap: 2,
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
        }} className="navbar-links-desktop">
          {navItems.map((item) => {
            const active = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? activeText : textColor,
                  background: active ? activeBg : 'transparent',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.03em',
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = hoverBg
                  if (!active) (e.currentTarget as HTMLElement).style.color = 'hsl(var(--text-primary))'
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
                  if (!active) (e.currentTarget as HTMLElement).style.color = textColor
                }}
              >
                <item.icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          paddingLeft: 16,
          borderLeft: `1px solid ${dividerColor}`,
          flexShrink: 0,
          marginLeft: 'auto',
        }}>
          <button
            onClick={handleToggleTheme}
            aria-label="Alternar tema"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: textColor,
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = hoverBg
              ;(e.currentTarget as HTMLElement).style.color = 'hsl(var(--accent))'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = textColor
            }}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <button
            onClick={handleLogout}
            aria-label="Sair"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: textColor,
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'hsl(var(--error) / 0.12)'
              ;(e.currentTarget as HTMLElement).style.color = 'hsl(var(--error))'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = textColor
            }}
          >
            <LogOut size={17} />
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: textColor,
              transition: 'all 0.18s ease',
            }}
            className="navbar-hamburger"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = hoverBg
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="navbar-mobile-drawer" style={{
          position: 'fixed',
          top: NAVBAR_HEIGHT,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
          background: bg,
          borderTop: `1px solid ${dividerColor}`,
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          fontFamily: "'Inter', sans-serif",
          overflowY: 'auto',
        }}>
          {navItems.map((item) => {
            const active = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  color: active ? activeText : textColor,
                  background: active ? activeBg : 'transparent',
                  borderLeft: active ? `3px solid ${activeText}` : '3px solid transparent',
                  transition: 'all 0.18s ease',
                }}
              >
                <item.icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                <span>{item.label}</span>
              </Link>
            )
          })}

        </div>
      )}

      {/* Responsive display rules */}
      <style>{`
        @keyframes drawerSlideIn {
          0%   { opacity: 0; transform: translateY(-14px) scale(0.985); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .navbar-mobile-drawer {
          animation: drawerSlideIn 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        @media (min-width: 900px) {
          .navbar-links-desktop { display: flex !important; }
          .navbar-hamburger { display: none !important; }
        }
      `}</style>
    </>
  )
}

export default Navbar
