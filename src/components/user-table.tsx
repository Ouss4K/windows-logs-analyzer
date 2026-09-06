"use client"

import { useMemo, useState } from "react"
import { AccountLink } from "@/components/account-link"
import { SeverityBadge } from "@/components/status-badges"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime, formatDuration } from "@/lib/format"
import type { UserProfile } from "@/lib/types"

export function UserTable({ users }: { users: UserProfile[] }) {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((user) =>
      [user.account, user.domain, ...user.sources, ...user.computers].join(" ").toLowerCase().includes(q),
    )
  }, [users, query])

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Find a user, IP, or host..."
        className="max-w-md"
      />
      <div className="rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Last logon</TableHead>
              <TableHead>Logons</TableHead>
              <TableHead>Failed</TableHead>
              <TableHead>Time logged in</TableHead>
              <TableHead>Sources</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((user) => (
              <TableRow key={user.account}>
                <TableCell>
                  <AccountLink account={user.account} domain={user.domain} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={user.riskLabel} />
                    <span className="font-mono text-xs">{user.riskScore}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{formatDateTime(user.lastLogon)}</TableCell>
                <TableCell className="font-mono">{user.successfulLogons}</TableCell>
                <TableCell className="font-mono text-destructive">{user.failedLogons || "—"}</TableCell>
                <TableCell className="font-mono">{formatDuration(user.sessionTimeMs)}</TableCell>
                <TableCell className="max-w-48 truncate font-mono text-xs text-muted-foreground">
                  {user.sources.slice(0, 3).join(", ") || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} accounts · click a name for the full story</p>
    </div>
  )
}
