const pad = (n) => String(n).padStart(2, '0')
export const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayStr = () => toStr(new Date())
export const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return toStr(d) }
export const money = (n) => '₹' + Number(n).toLocaleString('en-IN')
export const TYPES = ['SINGLE', 'DOUBLE', 'DELUXE', 'SUITE']

export function downloadCsv(filename, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
