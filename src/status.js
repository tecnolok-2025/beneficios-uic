export function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function effectiveStatus(item = {}, today = localDateKey()) {
  const raw = item.status || 'activo'
  if (raw === 'finalizado' || raw === 'revalidacion') return raw
  const endDate = String(item.endDate || '').slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(endDate) && endDate < today) return 'finalizado'
  return raw
}
