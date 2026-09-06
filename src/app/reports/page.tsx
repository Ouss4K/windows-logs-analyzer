import { AccountLink } from "@/components/account-link"
import { DemoBanner } from "@/components/demo-banner"
import { PageHeader } from "@/components/page-header"
import { PrintButton } from "@/components/print-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTime, formatDuration } from "@/lib/format"
import { getInvestigation } from "@/lib/investigation"

export const dynamic = "force-dynamic"

export default async function ReportsPage() {
  const { interactiveSessions, users, alerts, stats } = await getInvestigation()
  const open = interactiveSessions.filter((session) => session.status === "active")
  const afterHours = alerts.filter((alert) => alert.rule === "after_hours")
  const lockouts = alerts.filter((alert) => alert.rule === "account_lockout")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Who is signed in, who came in after hours, who is risky, and who got locked out."
        actions={
          <div className="flex gap-2 print:hidden">
            <Button asChild variant="outline">
              <a href="/api/export">Export all events</a>
            </Button>
            <PrintButton />
          </div>
        }
      />
      <DemoBanner demo={stats.demo} empty={stats.totalEvents === 0} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Signed in now</CardTitle>
            <CardDescription>Interactive sessions with no matching logoff</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {open.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open interactive sessions.</p>
            ) : (
              open.map((session) => (
                <div key={session.id} className="flex flex-wrap justify-between gap-3 text-sm">
                  <AccountLink account={session.account} domain={session.domain} />
                  <span className="text-muted-foreground">
                    {session.logonTypeName} · {formatDateTime(session.start)} · {session.ip || session.computer}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>After hours</CardTitle>
            <CardDescription>Interactive or RDP between 20:00 and 06:00</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {afterHours.slice(0, 12).map((alert) => (
              <div key={alert.id} className="flex justify-between gap-3 text-sm">
                <AccountLink account={alert.account} />
                <span className="text-muted-foreground">{formatDateTime(alert.time)}</span>
              </div>
            ))}
            {afterHours.length === 0 ? (
              <p className="text-sm text-muted-foreground">No after-hours interactive logons.</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Highest risk</CardTitle>
            <CardDescription>Accounts with the most concerning activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {users.slice(0, 10).map((user) => (
              <div key={user.account} className="flex justify-between gap-3 text-sm">
                <AccountLink account={user.account} domain={user.domain} />
                <span className="font-mono text-xs text-muted-foreground">
                  {user.riskScore} · {formatDuration(user.sessionTimeMs)} logged in
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lockouts</CardTitle>
            <CardDescription>Accounts Windows locked after failed logons</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {lockouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lockouts in this window.</p>
            ) : (
              lockouts.map((alert) => (
                <div key={alert.id} className="flex justify-between gap-3 text-sm">
                  <AccountLink account={alert.account} />
                  <span className="text-muted-foreground">{formatDateTime(alert.time)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
