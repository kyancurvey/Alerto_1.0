export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim())
export const MIN_PASSWORD = 8

// Philippine plate: three letters and three or four digits. Returns "ABC 1234" or null.
export function normalizePlate(value) {
  const match = String(value).trim().toUpperCase().match(/^([A-Z]{3}) ?(\d{3,4})$/)
  return match ? `${match[1]} ${match[2]}` : null
}

// Philippine mobile number (09xx, +63 9xx or 639xx). Returns "0917 555 0101" or null.
export function normalizePhone(value) {
  let digits = String(value).replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('63')) digits = `0${digits.slice(2)}`
  else if (digits.length === 10 && digits.startsWith('9')) digits = `0${digits}`
  return /^09\d{9}$/.test(digits) ? `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}` : null
}

// Unit pairing code such as ALT-7K3-92Q (dashes and spaces optional). Returns the code or null.
export function normalizeUnitCode(value) {
  const match = String(value).toUpperCase().replace(/[^A-Z0-9]/g, '').match(/^ALT([A-Z0-9]{3})([A-Z0-9]{3})$/)
  return match ? `ALT-${match[1]}-${match[2]}` : null
}

// A link that opens the phone's dialler for a number such as "0917 555 0101".
export const telHref = (number) => `tel:${String(number).replace(/\D/g, '')}`
