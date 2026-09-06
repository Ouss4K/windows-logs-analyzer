import { DemoBanner } from "@/components/demo-banner"
import { PageHeader } from "@/components/page-header"
import { SessionTable } from "@/components/session-table"
import { KpiCard } from "@/components/kpi-card"
import { formatDuration } from "@/lib/format"
import { getInvestigation } from "@/lib/investigation"

export const dynamic = "force-dynamic"

export default async function SessionsPage() {
  const { interactiveSessions, stats } = await getInvestigation()
  const closed = interactiveSessions.filter((session) => session.durationMs != null)
  const avg =
    closed.length === 0
      ? 0
      : Math.round(closed.reduce((sum, session) => sum + (session.durationMs ?? 0), 0) / closed.length)
  const longest = closed.reduce((max, session) => Math.max(max, session.durationMs ?? 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account log time"
        description="How long each interactive or RDP session lasted. Use Open now to see who is still signed in. Click a user for the full picture."
      />
      <DemoBanner demo={stats.demo} empty={stats.totalEvents === 0} />
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Interactive sessions" value={interactiveSessions.length} />
        <KpiCard label="Average duration" value={formatDuration(avg)} />
        <KpiCard label="Longest session" value={formatDuration(longest || undefined)} />
      </div>
      <SessionTable sessions={interactiveSessions} />
    </div>
  )
}
