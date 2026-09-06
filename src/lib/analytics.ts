import { INTERACTIVE_LOGON_TYPES, isMachineAccount } from "./catalog"
import { detectAlerts } from "./alerts"
import { interactiveSessions, reconstructSessions } from "./sessions"
import type { DashboardStats, LogEvent } from "./types"

export function isSuccessfulLogon(event: { eventId: number }) {
  return event.eventId === 4624 || event.eventId === 21 || event.eventId === 7001
}

export function humanUsers(events: LogEvent[]) {
  return new Set(
    events
      .map((event) => event.account)
      .filter((name) => name && !isMachineAccount(name)),
  )
}

export function buildStats(events: LogEvent[]): DashboardStats {
  const logons = events.filter((event) => isSuccessfulLogon(event))
  const failures = events.filter((event) => event.eventId === 4625)
  const sessions = reconstructSessions(events)
  const alerts = detectAlerts(events)
  const afterHours = logons.filter((event) => {
    if (event.logonType == null || !INTERACTIVE_LOGON_TYPES.has(event.logonType)) {
      return false
    }
    const hour = new Date(event.time).getHours()
    return hour >= 20 || hour < 6
  })

  const times = events.map((event) => event.time).sort()

  return {
    totalEvents: events.length,
    successfulLogons: logons.length,
    failedLogons: failures.length,
    uniqueUsers: humanUsers(events).size,
    uniqueSources: new Set(events.map((event) => event.ip).filter(Boolean)).size,
    lockouts: events.filter((event) => event.eventId === 4740).length,
    rdpLogons: logons.filter((event) => event.logonType === 10).length,
    privilegedLogons: events.filter((event) => event.eventId === 4672).length,
    openSessions: interactiveSessions(sessions).filter((session) => session.status === "active")
      .length,
    afterHours: afterHours.length,
    alerts: alerts.length,
    criticalAlerts: alerts.filter((alert) => alert.severity === "critical").length,
    lastEvent: times.at(-1),
    firstEvent: times[0],
    demo: false,
    ingestHistory: [],
  }
}

export function logonsByDay(events: LogEvent[], days = 14) {
  const logons = events.filter((event) => isSuccessfulLogon(event) || event.eventId === 4625)
  const buckets = new Map<string, { day: string; success: number; failed: number }>()
  const end = events.length
    ? new Date(events[events.length - 1].time)
    : new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    const day = d.toISOString().slice(0, 10)
    buckets.set(day, { day, success: 0, failed: 0 })
  }
  for (const event of logons) {
    const day = event.time.slice(0, 10)
    const bucket = buckets.get(day)
    if (!bucket) continue
    if (isSuccessfulLogon(event)) bucket.success += 1
    else bucket.failed += 1
  }
  return [...buckets.values()]
}

export function logonsByType(events: LogEvent[]) {
  const counts = new Map<string, number>()
  for (const event of events.filter((item) => isSuccessfulLogon(item))) {
    const label = event.logonTypeName || "Unknown"
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function topFailedAccounts(events: LogEvent[], limit = 8) {
  const counts = new Map<string, number>()
  for (const event of events.filter((item) => item.eventId === 4625)) {
    if (!event.account || isMachineAccount(event.account)) continue
    counts.set(event.account, (counts.get(event.account) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([account, failed]) => ({ account, failed }))
    .sort((a, b) => b.failed - a.failed)
    .slice(0, limit)
}

export function topTalkers(events: LogEvent[], limit = 8) {
  const counts = new Map<string, { account: string; logons: number; last: string }>()
  for (const event of events.filter((item) => isSuccessfulLogon(item) && !isMachineAccount(item.account))) {
    const current = counts.get(event.account) ?? {
      account: event.account,
      logons: 0,
      last: event.time,
    }
    current.logons += 1
    if (event.time > current.last) current.last = event.time
    counts.set(event.account, current)
  }
  return [...counts.values()].sort((a, b) => b.logons - a.logons).slice(0, limit)
}
