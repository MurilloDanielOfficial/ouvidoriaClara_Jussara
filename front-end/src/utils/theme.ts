const THEME_KEY = 'ouvidoria_theme'

export type Theme = 'dark' | 'light'

export function getTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return 'dark'
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme)
  applyTheme(theme)
}

export function applyTheme(theme: Theme): void {
  const body = document.body
  body.classList.add('theme-transition')
  if (theme === 'dark') {
    body.classList.remove('theme-light')
  } else {
    body.classList.add('theme-light')
  }
  setTimeout(() => body.classList.remove('theme-transition'), 300)
  window.dispatchEvent(new CustomEvent('theme-change', { detail: theme }))
}

export function toggleTheme(): Theme {
  const next = getTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}
