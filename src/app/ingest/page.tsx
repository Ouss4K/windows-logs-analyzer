import { IngestPanel } from "@/components/ingest-panel"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getInvestigation } from "@/lib/investigation"
import { formatDateTime } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function IngestPage() {
  const { stats } = await getInvestigation()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collect logs from this PC"
        description="Reads Windows event logs on this computer. Files stay in a local data folder next to the app."
      />
      <IngestPanel />
      <Card>
        <CardHeader>
          <CardTitle>Recent ingest runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats.ingestHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ingest history yet.</p>
          ) : (
            stats.ingestHistory.map((run) => (
              <div key={run.id} className="flex flex-wrap justify-between gap-2 text-sm">
                <span>
                  {run.label}{" "}
                  <span className="text-muted-foreground">({run.source})</span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {run.eventCount} events · {formatDateTime(run.finishedAt)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Audit policy checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>On the machine or GPO: Computer Configuration → Security Settings → Advanced Audit Policy.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Logon/Logoff → Logon, Logoff, Account Lockout, Special Logon, Other Logon/Logoff</li>
            <li>Account Management → User Account Management, Security Group Management</li>
            <li>Account Logon → Kerberos Authentication Service, Credential Validation</li>
          </ul>
          <p className="font-mono text-xs">
            auditpol /get /category:*
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
