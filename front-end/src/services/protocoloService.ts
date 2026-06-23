import { apiPut } from '../utils/api'
import type { Protocolo } from '../types'

export async function enviarProtocolo(protocolo: Protocolo): Promise<void> {
  await apiPut<void>('/protocolo', protocolo)
}
