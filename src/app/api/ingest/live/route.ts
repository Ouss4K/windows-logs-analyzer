import os from "node:os"
import { NextResponse } from "next/server"
import { collectWindowsEvents, collectorAvailable } from "@/lib/collector"
import { mergeEvents, replaceEvents } from "@/lib/store"

export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function POST(request: Request) {
  if (!collectorAvailable()) {
    return NextResponse.json(
      { error: "Live collection only works when this app runs on Windows." },
      { status: 400 },
    )
  }

  const body = (await request.json().catch(() => ({}))) as {
    days?: number
    maxEvents?: number
    merge?: boolean
  }

  try {
    const { events, warning } = await collectWindowsEvents({
      days: body.days ?? 14,
      maxEvents: body.maxEvents ?? 8000,
    })
    const label = `This PC (${os.hostname()})`
    const store = body.merge
      ? await mergeEvents(events, { source: "live", label })
      : await replaceEvents(events, { source: "live", label })
    return NextResponse.json({
      ok: true,
      eventCount: store.events.length,
      imported: events.length,
      warning,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Collection failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
