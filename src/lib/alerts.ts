import { INTERACTIVE_LOGON_TYPES, isMachineAccount, SENSITIVE_GROUPS } from "./catalog"
import { isAfterHours, isPublicIp } from "./flags"
import type { Alert, LogEvent } from "./types"

export function detectAlerts(events: LogEvent[]): Alert[] {
  const alerts: Alert[] = []
  const failures = events.filter((event) => event.eventId === 4625)
  const logons = events.filter((event) => event.eventId === 4624 || event.eventId === 21 || event.eventId === 7001)

  const failBuckets = new Map<string, LogEvent[]>()
  for (const event of failures) {
    const key = `${event.account}|${event.ip || event.workstation}`
    const list = failBuckets.get(key) ?? []
    list.push(event)
    failBuckets.set(key, list)
  }

  for (const [key, list] of failBuckets) {
    const ordered = list.sort((a, b) => a.time.localeCompare(b.time))
    let windowStart = 0
    for (let i = 0; i < ordered.length; i++) {
      while (
        new Date(ordered[i].time).getTime() -
          new Date(ordered[windowStart].time).getTime() >
        10 * 60 * 1000
      ) {
        windowStart += 1
      }
      const count = i - windowStart + 1
      if (count >= 8) {
        const slice = ordered.slice(windowStart, i + 1)
        const [account, source] = key.split("|")
        alerts.push({
          id: `brute-${key}-${slice[0].time}`,
          rule: "brute_force",
          severity: "critical",
          title: `Brute-force logon against ${account}`,
          description: `${count} failed logons from ${source || "unknown source"} within 10 minutes.`,
          time: slice[slice.length - 1].time,
          account,
          ip: slice[0].ip,
          computer: slice[0].computer,
          eventIds: slice.map((event) => event.id),
          count,
        })
        break
      }
    }
  }

  const sprayBuckets = new Map<string, Set<string>>()
  const sprayEvents = new Map<string, LogEvent[]>()
  for (const event of failures) {
    const ip = event.ip || event.workstation
    if (!ip) continue
    const window = Math.floor(new Date(event.time).getTime() / (15 * 60 * 1000))
    const key = `${ip}|${window}`
    const accounts = sprayBuckets.get(key) ?? new Set()
    accounts.add(event.account)
    sprayBuckets.set(key, accounts)
    const list = sprayEvents.get(key) ?? []
    list.push(event)
    sprayEvents.set(key, list)
  }
  for (const [key, accounts] of sprayBuckets) {
    if (accounts.size >= 6) {
      const list = sprayEvents.get(key) ?? []
      alerts.push({
        id: `spray-${key}`,
        rule: "password_spray",
        severity: "high",
        title: "Password spray suspected",
        description: `${accounts.size} distinct accounts failed from the same source in 15 minutes.`,
        time: list[list.length - 1]?.time ?? new Date().toISOString(),
        account: [...accounts].slice(0, 4).join(", "),
        ip: list[0]?.ip ?? "",
        computer: list[0]?.computer ?? "",
        eventIds: list.map((event) => event.id),
        count: accounts.size,
      })
    }
  }

  for (const event of events.filter((item) => item.eventId === 4740)) {
    alerts.push({
      id: `lockout-${event.id}`,
      rule: "account_lockout",
      severity: "high",
      title: `Account lockout: ${event.targetAccount || event.account}`,
      description: `Windows reported an account lockout on ${event.computer}.`,
      time: event.time,
      account: event.targetAccount || event.account,
      ip: event.ip,
      computer: event.computer,
      eventIds: [event.id],
      count: 1,
    })
  }

  for (const event of logons) {
    if (
      event.logonType != null &&
      INTERACTIVE_LOGON_TYPES.has(event.logonType) &&
      !isMachineAccount(event.account) &&
      isAfterHours(event.time)
    ) {
      alerts.push({
        id: `afterhours-${event.id}`,
        rule: "after_hours",
        severity: event.logonType === 10 ? "high" : "medium",
        title: `After-hours ${event.logonTypeName || "logon"} by ${event.account}`,
        description: `${event.account} signed in at ${new Date(event.time).toLocaleTimeString()} from ${event.ip || event.workstation || event.computer}.`,
        time: event.time,
        account: event.account,
        ip: event.ip,
        computer: event.computer,
        eventIds: [event.id],
        count: 1,
      })
    }
  }

  const privKeys = new Set<string>()
  for (const event of events.filter((item) => item.eventId === 4672)) {
    if (isMachineAccount(event.account || event.targetAccount)) continue
    const account = event.account || event.targetAccount
    const key = `${account}|${event.time.slice(0, 10)}`
    if (privKeys.has(key)) continue
    privKeys.add(key)
    alerts.push({
      id: `priv-${key}`,
      rule: "privileged_logon",
      severity: "medium",
      title: `Privileged logon: ${account}`,
      description: "Special privileges were assigned to a new logon (event 4672).",
      time: event.time,
      account,
      ip: event.ip,
      computer: event.computer,
      eventIds: [event.id],
      count: 1,
    })
  }

  for (const event of events.filter((item) => [4728, 4732, 4756].includes(item.eventId))) {
    const group = (event.targetAccount || event.message).toLowerCase()
    if (SENSITIVE_GROUPS.some((name) => group.includes(name) || event.message.toLowerCase().includes(name))) {
      alerts.push({
        id: `group-${event.id}`,
        rule: "sensitive_group",
        severity: "critical",
        title: "Sensitive group membership changed",
        description: `${event.callerAccount || event.account} changed membership involving ${event.targetAccount || "a privileged group"}.`,
        time: event.time,
        account: event.callerAccount || event.account,
        ip: event.ip,
        computer: event.computer,
        eventIds: [event.id],
        count: 1,
      })
    }
  }

  for (const event of events.filter((item) => item.eventId === 4648)) {
    if (isMachineAccount(event.account)) continue
    alerts.push({
      id: `explicit-${event.id}`,
      rule: "explicit_credentials",
      severity: "medium",
      title: `Explicit credentials used by ${event.callerAccount || event.account}`,
      description: "A process logged on with alternate credentials (possible lateral movement).",
      time: event.time,
      account: event.callerAccount || event.account,
      ip: event.ip,
      computer: event.computer,
      eventIds: [event.id],
      count: 1,
    })
  }

  for (const event of failures) {
    if (event.status.toUpperCase() === "0xC0000072" || event.failureReason.toLowerCase().includes("disabled")) {
      alerts.push({
        id: `disabled-${event.id}`,
        rule: "disabled_account",
        severity: "high",
        title: `Logon attempted with disabled account ${event.account}`,
        description: "A disabled account was used in an authentication attempt.",
        time: event.time,
        account: event.account,
        ip: event.ip,
        computer: event.computer,
        eventIds: [event.id],
        count: 1,
      })
    }
  }

  for (const event of logons) {
    if (event.logonType === 10 && isPublicIp(event.ip)) {
      alerts.push({
        id: `rdp-ext-${event.id}`,
        rule: "external_rdp",
        severity: "high",
        title: `RDP from public IP ${event.ip}`,
        description: `${event.account} opened a Remote Desktop session from a non-private address.`,
        time: event.time,
        account: event.account,
        ip: event.ip,
        computer: event.computer,
        eventIds: [event.id],
        count: 1,
      })
    }
  }

  const seenIps = new Map<string, Set<string>>()
  const orderedLogons = [...logons].sort((a, b) => a.time.localeCompare(b.time))
  for (const event of orderedLogons) {
    if (!event.account || !event.ip || isMachineAccount(event.account)) continue
    if (event.logonType == null || !INTERACTIVE_LOGON_TYPES.has(event.logonType)) continue
    const known = seenIps.get(event.account) ?? new Set<string>()
    if (known.size >= 2 && !known.has(event.ip)) {
      alerts.push({
        id: `newsrc-${event.id}`,
        rule: "new_source",
        severity: isPublicIp(event.ip) ? "high" : "medium",
        title: `New source for ${event.account}`,
        description: `${event.account} signed in from ${event.ip}, which was not used in earlier sessions.`,
        time: event.time,
        account: event.account,
        ip: event.ip,
        computer: event.computer,
        eventIds: [event.id],
        count: 1,
      })
    }
    known.add(event.ip)
    seenIps.set(event.account, known)
  }

  const seen = new Set<string>()
  return alerts
    .filter((alert) => {
      if (seen.has(alert.id)) return false
      seen.add(alert.id)
      return true
    })
    .sort((a, b) => b.time.localeCompare(a.time))
}

const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export function sortAlerts(alerts: Alert[]) {
  return [...alerts].sort((a, b) => {
    const rank = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    if (rank !== 0) return rank
    return b.time.localeCompare(a.time)
  })
}
