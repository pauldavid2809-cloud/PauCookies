export function money(amount: number, currency = 'Bs'): string {
  const formatted = amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency === '$' ? `$${formatted}` : `Bs ${formatted}`
}

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function waLink(phone: string, text: string): string {
  const clean = phone.replace(/[^0-9]/g, '')
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`
}
