import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { dataDir, uploadsDir } from "./paths"
import type { IngestRun, LogEvent, StoreShape } from "./types"

function storePath() {
  return path.join(dataDir(), "store.json")
}

const emptyStore = (): StoreShape => ({
  events: [],
  ingestHistory: [],
  demo: false,
})

export async function storeFileExists() {
  try {
    await access(storePath())
    return true
  } catch {
    return false
  }
}

export async function ensureDataDir() {
  await mkdir(dataDir(), { recursive: true })
  await mkdir(uploadsDir(), { recursive: true })
}

export async function readStore(): Promise<StoreShape> {
  try {
    const raw = await readFile(storePath(), "utf8")
    const parsed = JSON.parse(raw) as StoreShape
    return {
      events: parsed.events ?? [],
      ingestHistory: parsed.ingestHistory ?? [],
      demo: Boolean(parsed.demo),
    }
  } catch {
    return emptyStore()
  }
}

export async function writeStore(store: StoreShape) {
  await ensureDataDir()
  await writeFile(storePath(), JSON.stringify(store), "utf8")
}

export async function replaceEvents(
  events: LogEvent[],
  run: {
    startedAt?: string
    source: IngestRun["source"]
    label: string
  },
) {
  const now = new Date().toISOString()
  const store: StoreShape = {
    events,
    demo: run.source === "demo",
    ingestHistory: [
      {
        id: crypto.randomUUID(),
        source: run.source,
        startedAt: run.startedAt ?? now,
        finishedAt: now,
        eventCount: events.length,
        label: run.label,
      },
    ],
  }
  await writeStore(store)
  return store
}

export async function mergeEvents(
  incoming: LogEvent[],
  run: { source: IngestRun["source"]; label: string },
) {
  const current = await readStore()
  const seen = new Set(current.events.map((event) => event.id))
  const merged = [...current.events]
  for (const event of incoming) {
    if (!seen.has(event.id)) {
      seen.add(event.id)
      merged.push(event)
    }
  }
  merged.sort((a, b) => a.time.localeCompare(b.time))
  const now = new Date().toISOString()
  const store: StoreShape = {
    events: merged,
    demo: false,
    ingestHistory: [
      {
        id: crypto.randomUUID(),
        source: run.source,
        startedAt: now,
        finishedAt: now,
        eventCount: incoming.length,
        label: run.label,
      },
      ...current.ingestHistory,
    ].slice(0, 20),
  }
  await writeStore(store)
  return store
}

export async function clearStore() {
  const store = emptyStore()
  await writeStore(store)
  return store
}

export { dataDir }
