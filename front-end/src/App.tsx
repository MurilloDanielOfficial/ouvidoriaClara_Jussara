import { useEffect, useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { Box, CircularProgress } from '@mui/material'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ReclamacoesPage = lazy(() => import('./pages/ReclamacoesPage'))
const ContatosPage = lazy(() => import('./pages/ContatosPage'))
import { isSessionValid } from './utils/session'
import { getTheme } from './utils/theme'
import type { Theme } from './utils/theme'

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#1a2d5e' },
    secondary: { main: '#f06517' },
    background: { default: '#1a1a2e', paper: '#212537' },
    text: { primary: '#e8eaf0', secondary: '#8b94a8' },
    divider: '#3a3f55',
    success: { main: '#1eb859' },
    error: { main: '#e63946' },
    warning: { main: '#f4a261' },
    info: { main: '#0a84ff' },
  },
  typography: { fontFamily: "'Inter', sans-serif" },
  shape: { borderRadius: 10 },
})

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#223872' },
    secondary: { main: '#f06517' },
    background: { default: '#f0f4f8', paper: '#ffffff' },
    text: { primary: '#111827', secondary: '#6b7280' },
    divider: '#e5e7eb',
    success: { main: '#169a4d' },
    error: { main: '#c92a3a' },
    warning: { main: '#d9822e' },
    info: { main: '#0066cc' },
  },
  typography: { fontFamily: "'Inter', sans-serif" },
  shape: { borderRadius: 10 },
})

function RequireAuth({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<boolean | null>(null)
  useEffect(() => { setAuth(isSessionValid()) }, [])
  if (auth === null) return null
  return auth ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  const location = useLocation()
  const isLogin = location.pathname === '/login'
  const [muiTheme, setMuiTheme] = useState(getTheme() === 'dark' ? darkTheme : lightTheme)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Theme>).detail
      setMuiTheme(detail === 'dark' ? darkTheme : lightTheme)
    }
    window.addEventListener('theme-change', handler)
    return () => window.removeEventListener('theme-change', handler)
  }, [])

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      {!isLogin && (
        <RequireAuth>
          <Navbar />
        </RequireAuth>
      )}
      <div style={!isLogin ? { paddingTop: 64 } : undefined}>
      <div key={location.pathname} className="page-transition">
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}><CircularProgress /></Box>}>
      <Routes location={location}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><ReclamacoesPage /></RequireAuth>} />
        <Route path="/estatisticas" element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="/contatos" element={<RequireAuth><ContatosPage /></RequireAuth>} />
        <Route path="/clientes" element={<Navigate to="/contatos" replace />} />
        <Route path="/leads" element={<Navigate to="/contatos" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      </div>
      </div>
    </ThemeProvider>
  )
}

export default App
