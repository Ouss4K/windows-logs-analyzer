import { csvEscape } from "@/lib/format"
import { belongsToAccount } from "@/lib/flags"
import { readStore } from "@/lib/store"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const store = await readStore()
  const account = request.nextUrl.searchParams.get("account")
  const events = account
    ? store.events.filter((event) => belongsToAccount(account, event))
    : store.events
  const header = [
    "time",
    "eventId",
    "title",
    "account",
    "domain",
    "logonType",
    "ip",
    "workstation",
    "computer",
    "status",
    "failureReason",
  ]
  const lines = [
    header.join(","),
    ...events.map((event) =>
      [
        event.time,
        event.eventId,
        event.title,
        event.account,
        event.domain,
        event.logonTypeName,
        event.ip,
        event.workstation,
        event.computer,
        event.status,
        event.failureReason,
      ]
        .map((value) => csvEscape(value))
        .join(","),
    ),
  ]
  const filename = account ? `windowslogs-${account}.csv` : "windowslogs-events.csv"
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  })
}
