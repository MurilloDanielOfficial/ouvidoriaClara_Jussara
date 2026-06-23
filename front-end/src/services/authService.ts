import { apiPost } from '../utils/api'
import type { LoginSession, Usuario } from '../types'

export async function login(usuario: Usuario): Promise<LoginSession> {
  return apiPost<LoginSession>('/login', usuario)
}
