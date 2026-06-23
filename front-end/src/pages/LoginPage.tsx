import * as React from 'react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { TextField, CircularProgress, Box } from '@mui/material'
import { login } from '../services/authService'
import { setSession, isSessionValid } from '../utils/session'
import { applyTheme, getTheme } from '../utils/theme'

const SLIDES = [
  '/d1d092d8-8e15-4d3f-8d18-706b6309ba30.jpeg',
  '/b6043048-4920-4170-930a-59b54a1e2f45.jpeg',
  '/d4062c0c-db57-4e2d-ae93-00c29f2a728b.jpeg',
  '/15c24c6a-fcf0-43f7-ac5f-732067eda52a.jpeg',
]

const CAPTIONS = [
  'Vereadora Jussara Fernandes',
  'Câmara Municipal de Sorocaba',
  'Gabinete da Vereadora',
  'Conquistas e Diplomas',
]

const INTERVAL_MS = 5500

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [celular, setCelular] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    applyTheme(getTheme())
    if (isSessionValid()) navigate('/')
  }, [navigate])

  const goTo = (next: number) => {
    if (next === current) return
    setCurrent(next)
  }

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % SLIDES.length)
    }, INTERVAL_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!celular.trim() || !senha.trim()) { setError('Informe login e senha.'); return }
    setLoading(true)
    try {
      const session = await login({ celular, senha })
      setSession(session)
      navigate('/')
    } catch (err: any) {
      setError(err?.message?.includes('401') || err?.message?.includes('inválid')
        ? 'Credenciais inválidas.'
        : 'Não foi possível realizar o login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'hsl(var(--background))' }}>

      {/* ── LEFT: Slideshow ── */}
      <div style={{
        flex: '0 0 60%',
        position: 'relative',
        overflow: 'hidden',
        display: 'none',
      }} className="login-left-panel">
        {SLIDES.map((src, i) => (
          <div
            key={src}
            className={`login-slide ${i === current ? 'active' : 'inactive'}`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}

        {/* Bottom gradient overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.78) 100%)',
          zIndex: 3,
        }} />

        {/* Branding block */}
        <div style={{
          position: 'absolute',
          bottom: 64,
          left: 48,
          right: 48,
          zIndex: 4,
        }}>
          <p style={{
            margin: 0,
            color: '#f06517',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            marginBottom: 10,
            fontFamily: 'Inter, sans-serif',
          }}>
            {CAPTIONS[current]}
          </p>
          <h1 style={{
            margin: 0,
            color: '#ffffff',
            fontSize: 38,
            fontWeight: 800,
            lineHeight: 1.15,
            fontFamily: 'Inter, sans-serif',
            textShadow: '0 2px 16px rgba(0,0,0,0.5)',
          }}>
            Ouvidoria<br />Jussara
          </h1>
          <p style={{
            margin: '14px 0 0',
            color: 'rgba(255,255,255,0.72)',
            fontSize: 15,
            fontFamily: 'Inter, sans-serif',
            fontStyle: 'italic',
          }}>
            "Dar voz a quem não pode falar"
          </p>

          {/* Dots */}
          <div style={{ display: 'flex', gap: 8, marginTop: 28 }}>
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                style={{
                  width: i === current ? 28 : 8,
                  height: 8,
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  background: i === current ? '#223872' : 'rgba(255,255,255,0.35)',
                  transition: 'all 0.35s ease',
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>

      </div>

      {/* ── RIGHT: Login Form ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'hsl(var(--background))',
        padding: '48px 40px',
        position: 'relative',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 540,
          background: 'hsl(var(--surface))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 20,
          padding: '88px 52px',
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}>
          {/* Icon */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <img
              src="/logo.png"
              alt="Logo"
              style={{
                width: 96,
                height: 96,
                objectFit: 'contain',
              }}
            />
          </div>

          {/* Headline */}
          <p style={{
            margin: 0,
            textAlign: 'center',
            color: '#f06517',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            fontFamily: 'Inter, sans-serif',
            marginBottom: 8,
          }}>
            Bem-vindo de volta
          </p>
          <h2 style={{
            margin: '0 0 52px',
            textAlign: 'center',
            color: 'hsl(var(--text-primary))',
            fontSize: 28,
            fontWeight: 700,
            fontFamily: 'Inter, sans-serif',
          }}>
            Ouvidoria Jussara
          </h2>

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <TextField
                fullWidth
                label="Login"
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
                variant="outlined"
                autoComplete="username"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: 'hsl(var(--text-primary))',
                    borderRadius: '10px',
                    '& fieldset': { borderColor: 'hsl(var(--border))' },
                    '&:hover fieldset': { borderColor: 'hsl(var(--primary-light))' },
                    '&.Mui-focused fieldset': { borderColor: 'hsl(var(--accent))', borderWidth: '1.5px' },
                    bgcolor: 'hsl(var(--surface-2))',
                  },
                  '& .MuiInputLabel-root': { color: 'hsl(var(--text-secondary))' },
                  '& .MuiInputLabel-root.Mui-focused': { color: 'hsl(var(--accent))' },
                }}
              />
              <TextField
                fullWidth
                label="Senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                variant="outlined"
                autoComplete="current-password"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: 'hsl(var(--text-primary))',
                    borderRadius: '10px',
                    '& fieldset': { borderColor: 'hsl(var(--border))' },
                    '&:hover fieldset': { borderColor: 'hsl(var(--primary-light))' },
                    '&.Mui-focused fieldset': { borderColor: 'hsl(var(--accent))', borderWidth: '1.5px' },
                    bgcolor: 'hsl(var(--surface-2))',
                  },
                  '& .MuiInputLabel-root': { color: 'hsl(var(--text-secondary))' },
                  '& .MuiInputLabel-root.Mui-focused': { color: 'hsl(var(--accent))' },
                }}
              />

              {error && (
                <p style={{
                  margin: 0,
                  color: 'hsl(var(--error))',
                  fontSize: 13,
                  textAlign: 'center',
                  fontFamily: 'Inter, sans-serif',
                }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 8,
                  width: '100%',
                  padding: '16px 0',
                  border: 'none',
                  borderRadius: 10,
                  background: loading
                    ? 'hsl(var(--primary) / 0.5)'
                    : 'hsl(var(--primary))',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 15,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={(e) => {
                  if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--primary-hover))'
                }}
                onMouseLeave={(e) => {
                  if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--primary))'
                }}
              >
                {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Entrar'}
              </button>
            </Box>
          </form>

          {/* Footer */}
          <p style={{
            marginTop: 28,
            textAlign: 'center',
            color: 'hsl(var(--text-secondary) / 0.5)',
            fontSize: 11,
            fontFamily: 'Inter, sans-serif',
          }}>
            © {new Date().getFullYear()} Vereadora Jussara Fernandes · Sorocaba/SP
          </p>
        </div>
      </div>

      {/* Responsive style: show left panel on md+ */}
      <style>{`
        @media (min-width: 900px) {
          .login-left-panel { display: block !important; }
        }
      `}</style>
    </div>
  )
}

export default LoginPage
