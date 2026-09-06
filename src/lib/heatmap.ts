import { INTERACTIVE_LOGON_TYPES } from "./catalog"
import { isMachineAccount } from "./catalog"
import type { HeatCell, LogEvent } from "./types"

export function logonHeatmap(events: LogEvent[]): HeatCell[] {
  const cells = new Map<string, HeatCell>()
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      cells.set(`${day}-${hour}`, { day, hour, count: 0 })
    }
  }
  for (const event of events) {
    if (![4624, 21, 7001].includes(event.eventId) || isMachineAccount(event.account)) continue
    if (event.logonType == null || !INTERACTIVE_LOGON_TYPES.has(event.logonType)) continue
    const date = new Date(event.time)
    const key = `${date.getDay()}-${date.getHours()}`
    const cell = cells.get(key)
    if (cell) cell.count += 1
  }
  return [...cells.values()]
}
