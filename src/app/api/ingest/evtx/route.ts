import { writeFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { collectWindowsEvents, collectorAvailable } from "@/lib/collector"
import { uploadsDir } from "@/lib/paths"
import { ensureDataDir, mergeEvents, replaceEvents } from "@/lib/store"

export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function POST(request: Request) {
  if (!collectorAvailable()) {
    return NextResponse.json(
      { error: "EVTX parsing uses Windows Get-WinEvent and must run on Windows." },
      { status: 400 },
    )
  }

  const form = await request.formData()
  const file = form.get("file")
  const merge = form.get("merge") === "true"
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a .evtx file." }, { status: 400 })
  }

  await ensureDataDir()
  const dest = path.join(uploadsDir(), `${Date.now()}-${file.name}`)
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(dest, buffer)

  try {
    const { events, warning } = await collectWindowsEvents({
      evtxPath: dest,
      maxEvents: 20000,
    })
    const store = merge
      ? await mergeEvents(events, { source: "evtx", label: file.name })
      : await replaceEvents(events, { source: "evtx", label: file.name })
    return NextResponse.json({
      ok: true,
      eventCount: store.events.length,
      imported: events.length,
      warning,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "EVTX import failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
