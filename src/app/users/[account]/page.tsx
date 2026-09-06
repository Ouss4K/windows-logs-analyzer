import { AlertList } from "@/components/alert-list"
import { EventTable } from "@/components/event-table"
import { KpiCard } from "@/components/kpi-card"
import { PageHeader } from "@/components/page-header"
import { SessionTable } from "@/components/session-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SeverityBadge } from "@/components/status-badges"
import { belongsToAccount } from "@/lib/flags"
import { formatDateTime, formatDuration } from "@/lib/format"
import { getInvestigation } from "@/lib/investigation"

export const dynamic = "force-dynamic"

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ account: string }>
}) {
  const { account: raw } = await params
  const account = decodeURIComponent(raw)
  const { events, interactiveSessions, alerts, users } = await getInvestigation()
  const profile = users.find((user) => user.account.toLowerCase() === account.toLowerCase())
  const name = profile?.account ?? account
  const userEvents = events.filter((event) => belongsToAccount(account, event)).reverse()
  const userSessions = interactiveSessions.filter(
    (session) => session.account.toLowerCase() === account.toLowerCase(),
  )
  const userAlerts = alerts.filter((alert) =>
    alert.account.split(",").some((part) => part.trim().toLowerCase() === account.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={name}
        description={`${profile?.domain ? `${profile.domain}\\` : ""}${name} — first and last connection, time logged in, and everything this account touched.`}
        actions={
          <Button asChild variant="outline">
            <a href={`/api/export?account=${encodeURIComponent(name)}`}>Export this user</a>
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={profile?.riskLabel ?? "low"} />
        <span className="font-mono text-sm">Risk {profile?.riskScore ?? 0}</span>
        {profile?.riskReasons.length ? (
          <span className="text-sm text-muted-foreground">{profile.riskReasons.join(" · ")}</span>
        ) : (
          <span className="text-sm text-muted-foreground">No risk signals on this account</span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Last logon" value={formatDateTime(profile?.lastLogon)} />
        <KpiCard label="First logon" value={formatDateTime(profile?.firstLogon)} />
        <KpiCard label="Time logged in" value={formatDuration(profile?.sessionTimeMs ?? 0)} />
        <KpiCard label="Open sessions" value={profile?.openSessions ?? 0} />
        <KpiCard label="Successful logons" value={profile?.successfulLogons ?? 0} tone="ok" />
        <KpiCard
          label="Failed logons"
          value={profile?.failedLogons ?? 0}
          tone={profile?.failedLogons ? "danger" : "default"}
        />
        <KpiCard label="RDP" value={profile?.rdpLogons ?? 0} />
        <KpiCard label="After hours" value={profile?.afterHours ?? 0} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sources</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-sm">
            {(profile?.sources.length ? profile.sources : ["—"]).join(", ")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Computers</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-sm">
            {(profile?.computers.length ? profile.computers : ["—"]).join(", ")}
          </CardContent>
        </Card>
      </div>
      <div className="space-y-3">
        <h2 className="font-heading text-lg">Sessions</h2>
        <SessionTable sessions={userSessions} />
      </div>
      <div className="space-y-3">
        <h2 className="font-heading text-lg">Alerts</h2>
        <AlertList alerts={userAlerts} />
      </div>
      <div className="space-y-3">
        <h2 className="font-heading text-lg">Activity</h2>
        <EventTable events={userEvents} empty="No events for this account." />
      </div>
    </div>
  )
}
