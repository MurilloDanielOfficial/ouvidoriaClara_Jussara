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
    primary: { main: '#2A4572' },
    secondary: { main: '#E89E70' },
    background: { default: '#1C1E34', paper: '#222640' },
    text: { primary: '#e8eaf0', secondary: '#A1A9B8' },
    divider: '#3a3f55',
    success: { main: '#66BB80' },
    error: { main: '#D16670' },
    warning: { main: '#E2AF7A' },
    info: { main: '#62A1D8' },
  },
  typography: { fontFamily: "'Inter', sans-serif" },
  shape: { borderRadius: 10 },
})

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#41669C' },
    secondary: { main: '#E89E70' },
    background: { default: '#F1F4F9', paper: '#ffffff' },
    text: { primary: '#111827', secondary: '#6b7280' },
    divider: '#e5e7eb',
    success: { main: '#53A16E' },
    error: { main: '#B24E5A' },
    warning: { main: '#C28E5D' },
    info: { main: '#4D81B2' },
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
