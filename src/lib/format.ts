export function formatDateTime(iso?: string) {
  if (!iso) return "—"
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
}

export function formatTime(iso?: string) {
  if (!iso) return "—"
  return new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(new Date(iso))
}

export function formatDuration(ms?: number) {
  if (ms == null) return "Open"
  const minutes = Math.max(0, Math.round(ms / 60000))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}m`
  if (hours < 48) return `${hours}h ${rest}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

export function relativeTime(iso?: string) {
  if (!iso) return "—"
  const delta = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(delta / 60000)
  if (Math.abs(minutes) < 1) return "just now"
  if (Math.abs(minutes) < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 48) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function csvEscape(value: string | number | undefined) {
  const text = String(value ?? "")
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`
  return text
}
