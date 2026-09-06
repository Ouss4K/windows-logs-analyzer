import { AccountLink } from "@/components/account-link"
import { DemoBanner } from "@/components/demo-banner"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime } from "@/lib/format"
import { getInvestigation } from "@/lib/investigation"

export const dynamic = "force-dynamic"

export default async function SourcesPage() {
  const { sources, stats } = await getInvestigation()

  return (
    <div className="space-y-6">
      <PageHeader
        title="IPs and workstations"
        description="Where connections came from. Public IPs and sources with many failures rise to the top."
      />
      <DemoBanner demo={stats.demo} empty={stats.totalEvents === 0} />
      <div className="rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Logons</TableHead>
              <TableHead>Failures</TableHead>
              <TableHead>Last seen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((source) => (
              <TableRow key={source.id}>
                <TableCell className="font-mono text-xs">
                  {source.value}{" "}
                  {source.public ? <Badge variant="destructive">public</Badge> : null}
                </TableCell>
                <TableCell className="text-muted-foreground">{source.kind}</TableCell>
                <TableCell className="space-x-2">
                  {source.users.slice(0, 4).map((user) => (
                    <AccountLink key={user} account={user} />
                  ))}
                </TableCell>
                <TableCell className="font-mono">{source.logons}</TableCell>
                <TableCell className="font-mono text-destructive">{source.failures || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{formatDateTime(source.lastSeen)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
