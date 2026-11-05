/**
 * Utilitas format tampilan (tanggal, dll).
 */

export function formatDate(dateString) {
  if (!dateString) return '-'
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dateString))
  } catch {
    return dateString
  }
}

export function formatRelativeTime(dateString) {
  if (!dateString) return '-'
  const diffMs = Date.now() - new Date(dateString).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} hari lalu`
  return formatDate(dateString)
}

export function getInitial(name) {
  if (!name) return '?'
  return name.trim().charAt(0).toUpperCase()
}
