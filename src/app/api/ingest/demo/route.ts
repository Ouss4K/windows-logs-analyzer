import { NextResponse } from "next/server"
import { buildDemoEvents } from "@/lib/demo"
import { replaceEvents } from "@/lib/store"

export const dynamic = "force-dynamic"

export async function POST() {
  const events = buildDemoEvents()
  const store = await replaceEvents(events, {
    source: "demo",
    label: "Sample investigation (CORP.local)",
  })
  return NextResponse.json({
    ok: true,
    eventCount: store.events.length,
    demo: true,
  })
}
