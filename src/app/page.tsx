import Link from "next/link"
import { LogonTrendChart, LogonTypeChart } from "@/components/charts"
import { DemoBanner } from "@/components/demo-banner"
import { Heatmap } from "@/components/heatmap"
import { KpiCard } from "@/components/kpi-card"
import { PageHeader } from "@/components/page-header"
import { AccountLink } from "@/components/account-link"
import { SeverityBadge } from "@/components/status-badges"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTime, relativeTime } from "@/lib/format"
import { getInvestigation } from "@/lib/investigation"

export const dynamic = "force-dynamic"

export default async function OverviewPage() {
  const { stats, alerts, charts, heatmap, users } = await getInvestigation()

  return (
    <div className="space-y-6">
      <PageHeader
        title="What happened on this PC?"
        description="These reports are built from this computer’s event logs. Nothing is sent to the cloud."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <a href="/api/export">Export CSV</a>
            </Button>
            <Button asChild>
              <Link href="/ingest">Refresh this PC</Link>
            </Button>
          </div>
        }
      />
      <DemoBanner demo={stats.demo} empty={stats.totalEvents === 0} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard href="/logons" label="Successful logons" value={stats.successfulLogons} hint="Open connections" tone="ok" />
        <KpiCard
          href="/failures"
          label="Failed logons"
          value={stats.failedLogons}
          hint="Wrong password, lockouts, unknown users"
          tone={stats.failedLogons > 20 ? "danger" : "warn"}
        />
        <KpiCard href="/sessions" label="Open sessions" value={stats.openSessions} hint="Signed in with no logoff yet" />
        <KpiCard
          href="/alerts"
          label="Alerts"
          value={stats.alerts}
          hint={`${stats.criticalAlerts} critical`}
          tone={stats.criticalAlerts > 0 ? "danger" : "default"}
        />
        <KpiCard href="/users" label="Users" value={stats.uniqueUsers} hint="Click to rank by risk" />
        <KpiCard href="/logons" label="RDP connections" value={stats.rdpLogons} hint="Remote Desktop, type 10" />
        <KpiCard href="/accounts" label="Account lockouts" value={stats.lockouts} tone={stats.lockouts > 0 ? "danger" : "ok"} />
        <KpiCard href="/alerts" label="After-hours logons" value={stats.afterHours} hint="20:00–06:00" />
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Logon activity</CardTitle>
            <CardDescription>Successful vs failed authentications by day</CardDescription>
          </CardHeader>
          <CardContent>
            <LogonTrendChart data={charts.byDay} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>How they connected</CardTitle>
            <CardDescription>Interactive, network, RDP, service</CardDescription>
          </CardHeader>
          <CardContent>
            <LogonTypeChart data={charts.byType} />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>When people sign in</CardTitle>
          <CardDescription>Interactive and RDP logons by weekday and hour (local time)</CardDescription>
        </CardHeader>
        <CardContent>
          <Heatmap cells={heatmap} />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Priority alerts</CardTitle>
            <CardDescription>Investigate the noisiest risks first</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.slice(0, 6).map((alert) => (
              <div key={alert.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <SeverityBadge severity={alert.severity} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{alert.description}</p>
                <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                  {formatDateTime(alert.time)} · {alert.ip || alert.computer}
                </p>
              </div>
            ))}
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No detections on the current dataset.</p>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link href="/alerts">All alerts</Link>
              </Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Highest-risk users</CardTitle>
            <CardDescription>Failed logons, lockouts, after-hours, and public RDP raise the score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {users.slice(0, 8).map((user) => (
              <div key={user.account} className="flex items-center justify-between gap-3 text-sm">
                <AccountLink account={user.account} domain={user.domain} />
                <span className="flex items-center gap-2 text-muted-foreground">
                  <SeverityBadge severity={user.riskLabel} />
                  <span className="font-mono text-xs">
                    {user.successfulLogons} in · last {relativeTime(user.lastLogon)}
                  </span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
