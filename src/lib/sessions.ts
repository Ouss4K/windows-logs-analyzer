import { INTERACTIVE_LOGON_TYPES } from "./catalog"
import type { LogEvent, UserSession } from "./types"

function sessionKey(event: LogEvent) {
  return `${event.computer}|${event.logonId || event.account}|${event.logonType ?? ""}`
}

const SESSION_START = new Set([4624, 21, 7001])
const SESSION_END = new Set([4634, 4647, 23, 7002])

export function reconstructSessions(events: LogEvent[]): UserSession[] {
  const sessions = new Map<string, UserSession>()
  const ordered = [...events].sort((a, b) => a.time.localeCompare(b.time))

  for (const event of ordered) {
    if (SESSION_START.has(event.eventId) && (event.logonId || event.account)) {
      const id = sessionKey(event)
      sessions.set(id, {
        id,
        account: event.account,
        domain: event.domain,
        computer: event.computer,
        logonId: event.logonId,
        logonType: event.logonType,
        logonTypeName: event.logonTypeName,
        ip: event.ip,
        workstation: event.workstation,
        start: event.time,
        status: "active",
        elevated: event.elevated,
      })
    }

    if (SESSION_END.has(event.eventId) && (event.logonId || event.account)) {
      const match =
        sessions.get(sessionKey(event)) ??
        [...sessions.values()].find(
          (session) =>
            session.status === "active" &&
            session.computer === event.computer &&
            (event.logonId ? session.logonId === event.logonId : session.account === event.account),
        )
      if (match) {
        match.end = event.time
        match.status = "closed"
        match.durationMs = Math.max(
          0,
          new Date(event.time).getTime() - new Date(match.start).getTime(),
        )
      }
    }

    if (event.eventId === 4672 && event.logonId) {
      const match = [...sessions.values()].find(
        (session) => session.logonId === event.logonId && session.computer === event.computer,
      )
      if (match) match.elevated = true
    }
  }

  return [...sessions.values()].sort((a, b) => b.start.localeCompare(a.start))
}

export function interactiveSessions(sessions: UserSession[]) {
  return sessions.filter(
    (session) => session.logonType != null && INTERACTIVE_LOGON_TYPES.has(session.logonType),
  )
}
