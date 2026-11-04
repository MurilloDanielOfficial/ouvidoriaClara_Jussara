export const formatPhoneDisplay = (value?: string | null, comDDI = false): string => {
  if (value == null) return ''
  const digits = String(value).replace(/\D/g, '')
  const hasDDI = digits.startsWith('55')
  const rest = hasDDI ? digits.slice(2) : digits
  const fmt =
    rest.length === 11
      ? `(${rest.slice(0, 2)}) ${rest.slice(2, 7)}-${rest.slice(7)}`
      : rest.length === 10
        ? `(${rest.slice(0, 2)}) ${rest.slice(2, 6)}-${rest.slice(6)}`
        : null
  if (fmt == null) return digits
  return comDDI && hasDDI ? `+55 ${fmt}` : fmt
}

export const normalizeTelefone = (telefone: string): string => {
  const somenteNumeros = telefone.replace(/\D/g, '').replace(/^0+/, '')
  let result = somenteNumeros
  if (!result.startsWith('55')) {
    result = '55' + result
  }
  if (result.length > 13) {
    result = result.slice(0, 13)
  }
  return result
}
