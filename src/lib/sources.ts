import { isPublicIp } from "./flags"
import type { LogEvent, SourceProfile } from "./types"

export function buildSources(events: LogEvent[]): SourceProfile[] {
  const map = new Map<string, SourceProfile>()

  function bump(kind: SourceProfile["kind"], value: string, event: LogEvent, failed: boolean) {
    if (!value || value === "-") return
    const id = `${kind}:${value}`
    const current = map.get(id) ?? {
      id,
      kind,
      value,
      public: kind === "ip" && isPublicIp(value),
      users: [],
      logons: 0,
      failures: 0,
      lastSeen: event.time,
    }
    if (event.account && !current.users.includes(event.account)) current.users.push(event.account)
    if (failed) current.failures += 1
    else current.logons += 1
    if (event.time > current.lastSeen) current.lastSeen = event.time
    map.set(id, current)
  }

  for (const event of events) {
    const failed = event.eventId === 4625
    const success = event.eventId === 4624 || event.eventId === 21 || event.eventId === 7001
    if (!failed && !success) continue
    bump("ip", event.ip, event, failed)
    bump("workstation", event.workstation, event, failed)
  }

  return [...map.values()].sort((a, b) => b.failures - a.failures || b.logons - a.logons)
}
