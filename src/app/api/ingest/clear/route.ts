import { NextResponse } from "next/server"
import { clearStore } from "@/lib/store"

export const dynamic = "force-dynamic"

export async function POST() {
  await clearStore()
  return NextResponse.json({ ok: true })
}
