export const formatPhoneDisplay = (value?: string | null): string => {
  if (value == null) return ''
  const digits = String(value).replace(/\D/g, '')
  let rest = digits.startsWith('55') ? digits.slice(2) : digits
  if (rest.length === 11) {
    return `(${rest.slice(0, 2)}) ${rest.slice(2, 7)}-${rest.slice(7)}`
  }
  if (rest.length === 10) {
    return `(${rest.slice(0, 2)}) ${rest.slice(2, 6)}-${rest.slice(6)}`
  }
  return digits
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
