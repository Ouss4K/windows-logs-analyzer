import os from "node:os"
import { detectAlerts, sortAlerts } from "./alerts"
import { buildStats, logonsByDay, logonsByType, topFailedAccounts, topTalkers } from "./analytics"
import { collectWindowsEvents, collectorAvailable } from "./collector"
import { logonHeatmap } from "./heatmap"
import { buildUserProfiles } from "./profiles"
import { interactiveSessions, reconstructSessions } from "./sessions"
import { buildSources } from "./sources"
import { readStore, replaceEvents, storeFileExists } from "./store"

let localLoad: Promise<void> | null = null

function thisPcLabel() {
  return `This PC (${os.hostname()})`
}

async function loadThisPcIfNeeded() {
  if (await storeFileExists()) return
  if (!collectorAvailable()) return
  if (!localLoad) {
    localLoad = (async () => {
      try {
        const { events } = await collectWindowsEvents({ days: 14, maxEvents: 8000 })
        await replaceEvents(events, { source: "live", label: thisPcLabel() })
      } catch {
        await replaceEvents([], { source: "live", label: thisPcLabel() })
      }
    })()
  }
  await localLoad
}

export async function getInvestigation() {
  await loadThisPcIfNeeded()
  const store = await readStore()
  const events = store.events
  const sessions = reconstructSessions(events)
  const alerts = sortAlerts(detectAlerts(events))
  const stats = buildStats(events)
  stats.demo = store.demo
  stats.ingestHistory = store.ingestHistory
  const users = buildUserProfiles(events, alerts)

  return {
    store,
    events,
    sessions,
    interactiveSessions: interactiveSessions(sessions),
    alerts,
    users,
    sources: buildSources(events),
    heatmap: logonHeatmap(events),
    stats,
    charts: {
      byDay: logonsByDay(events),
      byType: logonsByType(events),
      topFailed: topFailedAccounts(events),
      topTalkers: topTalkers(events),
    },
  }
}
