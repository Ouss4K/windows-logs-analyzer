import { NextResponse } from "next/server"
import { getInvestigation } from "@/lib/investigation"

export const dynamic = "force-dynamic"

export async function GET() {
  const { users, events, stats, alerts } = await getInvestigation()
  return NextResponse.json({
    stats: {
      eventCount: stats.totalEvents,
      alerts: stats.alerts,
      critical: stats.criticalAlerts,
      demo: stats.demo,
      lastEvent: stats.lastEvent,
    },
    users: users.map((user) => ({
      account: user.account,
      domain: user.domain,
      riskScore: user.riskScore,
      lastLogon: user.lastLogon,
    })),
    events: [...events]
      .reverse()
      .slice(0, 80)
      .map((event) => ({
        id: event.id,
        title: event.title,
        account: event.account,
        time: event.time,
        eventId: event.eventId,
      })),
    alertCount: alerts.length,
  })
}
