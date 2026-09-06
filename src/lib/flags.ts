export function isAfterHours(iso: string) {
  const hour = new Date(iso).getHours()
  return hour >= 20 || hour < 6
}

export function isPublicIp(ip: string) {
  if (!ip || ip === "-" || ip === "::1" || ip === "127.0.0.1") return false
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("169.254.")) {
    return false
  }
  const parts = ip.split(".")
  if (parts[0] === "172") {
    const second = Number(parts[1])
    if (second >= 16 && second <= 31) return false
  }
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip)
}

export function accountHref(account: string) {
  return `/users/${encodeURIComponent(account)}`
}

export function displayAccount(domain: string, account: string) {
  if (!account) return "—"
  return domain ? `${domain}\\${account}` : account
}

export function belongsToAccount(account: string, event: { account: string; targetAccount: string; callerAccount: string }) {
  const name = account.toLowerCase()
  return (
    event.account.toLowerCase() === name ||
    event.targetAccount.toLowerCase() === name ||
    event.callerAccount.toLowerCase() === name
  )
}

export function withinRange(iso: string, range: "24h" | "7d" | "14d" | "all", endMs: number) {
  if (range === "all") return true
  const hours = range === "24h" ? 24 : range === "7d" ? 24 * 7 : 24 * 14
  return endMs - new Date(iso).getTime() <= hours * 3600 * 1000
}

export function datasetEnd(times: string[]) {
  if (times.length === 0) return Date.now()
  return Math.max(...times.map((time) => new Date(time).getTime()))
}
