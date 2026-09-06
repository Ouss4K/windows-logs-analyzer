import { INTERACTIVE_LOGON_TYPES, isMachineAccount } from "./catalog"
import { isAfterHours, isPublicIp } from "./flags"
import { isSuccessfulLogon } from "./analytics"
import { interactiveSessions, reconstructSessions } from "./sessions"
import type { Alert, LogEvent, UserProfile } from "./types"

function riskLabel(score: number): UserProfile["riskLabel"] {
  if (score >= 70) return "critical"
  if (score >= 40) return "high"
  if (score >= 20) return "medium"
  return "low"
}

export function buildUserProfiles(events: LogEvent[], alerts: Alert[]): UserProfile[] {
  const names = new Set<string>()
  for (const event of events) {
    for (const name of [event.account, event.targetAccount, event.callerAccount]) {
      if (name && !isMachineAccount(name) && name !== "-") names.add(name)
    }
  }

  const sessions = interactiveSessions(reconstructSessions(events))
  const profiles: UserProfile[] = []

  for (const account of names) {
    const related = events.filter(
      (event) =>
        event.account === account ||
        event.targetAccount === account ||
        event.callerAccount === account,
    )
    const logons = related.filter((event) => isSuccessfulLogon(event) && event.account === account)
    const failures = related.filter((event) => event.eventId === 4625)
    const userSessions = sessions.filter((session) => session.account === account)
    const sources = [
      ...new Set(logons.map((event) => event.ip || event.workstation).filter(Boolean)),
    ]
    const computers = [...new Set(related.map((event) => event.computer).filter(Boolean))]
    const afterHours = logons.filter(
      (event) =>
        event.logonType != null &&
        INTERACTIVE_LOGON_TYPES.has(event.logonType) &&
        isAfterHours(event.time),
    ).length
    const lockouts = related.filter((event) => event.eventId === 4740).length
    const privileged = related.some((event) => event.eventId === 4672 || event.elevated)
    const publicRdp = logons.some((event) => event.logonType === 10 && isPublicIp(event.ip))
    const userAlerts = alerts.filter((alert) =>
      alert.account.split(",").some((part) => part.trim() === account),
    )
    const sessionTimeMs = userSessions.reduce((sum, session) => sum + (session.durationMs ?? 0), 0)
    const times = logons.map((event) => event.time).sort()

    const reasons: string[] = []
    let score = 0
    if (failures.length >= 3) {
      score += Math.min(30, failures.length * 2)
      reasons.push(`${failures.length} failed logons`)
    }
    if (lockouts > 0) {
      score += 25
      reasons.push("account lockout")
    }
    if (afterHours > 0) {
      score += Math.min(20, afterHours * 6)
      reasons.push("after-hours access")
    }
    if (publicRdp) {
      score += 25
      reasons.push("RDP from a public IP")
    }
    if (privileged) {
      score += 8
      reasons.push("privileged logon")
    }
    if (userAlerts.some((alert) => alert.rule === "brute_force" || alert.rule === "password_spray")) {
      score += 20
      reasons.push("password attack")
    }
    if (userAlerts.some((alert) => alert.rule === "sensitive_group")) {
      score += 20
      reasons.push("sensitive group change")
    }
    score = Math.min(100, score)

    profiles.push({
      account,
      domain: logons[0]?.domain || related[0]?.domain || "",
      firstLogon: times[0],
      lastLogon: times.at(-1),
      successfulLogons: logons.length,
      failedLogons: failures.length,
      rdpLogons: logons.filter((event) => event.logonType === 10).length,
      afterHours,
      lockouts,
      sessionTimeMs,
      openSessions: userSessions.filter((session) => session.status === "active").length,
      sources,
      computers,
      riskScore: score,
      riskLabel: riskLabel(score),
      riskReasons: reasons,
      privileged,
      alertCount: userAlerts.length,
    })
  }

  return profiles.sort((a, b) => b.riskScore - a.riskScore || (b.lastLogon ?? "").localeCompare(a.lastLogon ?? ""))
}
