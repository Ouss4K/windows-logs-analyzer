import { DemoBanner } from "@/components/demo-banner"
import { EventTable } from "@/components/event-table"
import { KpiCard } from "@/components/kpi-card"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getInvestigation } from "@/lib/investigation"

export const dynamic = "force-dynamic"

export default async function FailuresPage() {
  const { events, stats, charts } = await getInvestigation()
  const failures = events.filter((event) => event.eventId === 4625 || event.eventId === 4771).reverse()
  const reasons = new Map<string, number>()
  for (const event of failures) {
    const reason = event.failureReason || event.status || "Unknown"
    reasons.set(reason, (reasons.get(reason) ?? 0) + 1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Failed logons"
        description="Wrong password, unknown user, locked, disabled, expired. Click a user to see if the failures turned into a lockout or a successful logon."
      />
      <DemoBanner demo={stats.demo} empty={stats.totalEvents === 0} />
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Failed attempts" value={stats.failedLogons} tone="danger" />
        <KpiCard label="Lockouts" value={stats.lockouts} tone={stats.lockouts ? "danger" : "default"} />
        <KpiCard label="Distinct sources" value={stats.uniqueSources} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Failure reasons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...reasons.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([reason, count]) => (
                <div key={reason} className="flex justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{reason}</span>
                  <span className="font-mono">{count}</span>
                </div>
              ))}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Accounts under pressure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {charts.topFailed.map((row) => (
              <div key={row.account} className="flex justify-between font-mono text-sm">
                <span>{row.account}</span>
                <span className="text-destructive">{row.failed} failures</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <EventTable events={failures} empty="No failed logons in the current store." />
    </div>
  )
}
