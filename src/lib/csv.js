// Comma-separated files that open correctly in a spreadsheet.
// columns: [{ label, value(row) }]. Values that a spreadsheet could read as a formula are written as text.
const FORMULA_START = /^[=+\-@\t\r]/

function cell(value) {
  if (value === null || value === undefined) return ''
  let text = String(value)
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(columns, rows) {
  const lines = [columns.map((column) => cell(column.label)), ...rows.map((row) => columns.map((column) => cell(column.value(row))))]
  return `${lines.map((line) => line.join(',')).join('\r\n')}\r\n`
}

// Saves the text as a file. The byte order mark makes spreadsheets read accents and Filipino letters correctly.
export function downloadCsv(filename, text) {
  const blob = new Blob(['\ufeff', text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
