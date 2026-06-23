import { API_BASE_URL } from '../utils/config'

const UPLOAD_BASE_URL = (import.meta.env.VITE_UPLOAD_BASE_URL as string | undefined) || 'https://vereadorajussara.ouvidoria.darwinsistema.com.br'

export async function uploadMidia(file: File): Promise<{ message: string; file_path: string; url: string }> {
  const formData = new FormData()
  formData.append('midia', file)

  const response = await fetch(`${API_BASE_URL}/midia/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro ao fazer upload' }))
    throw new Error(error.message || 'Erro ao fazer upload')
  }

  const data = await response.json()

  // Extrai o caminho relativo após /clientes/ e monta a URL pública
  const clientesIndex = data.file_path.indexOf('/clientes/')
  if (clientesIndex !== -1) {
    const relativePath = data.file_path.slice(clientesIndex + '/clientes/'.length)
    data.url = `${UPLOAD_BASE_URL}/${relativePath.split('/').map(encodeURIComponent).join('/')}`
  } else {
    // fallback: usa apenas o nome do arquivo
    const parts = data.file_path.split('/')
    data.url = `${UPLOAD_BASE_URL}/uploads/${encodeURIComponent(parts[parts.length - 1])}`
  }

  return data
}
