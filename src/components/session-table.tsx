"use client"

import { useMemo, useState } from "react"
import { AccountLink } from "@/components/account-link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LogonTypeBadge } from "@/components/status-badges"
import { formatDateTime, formatDuration } from "@/lib/format"
import type { UserSession } from "@/lib/types"

const PAGE_SIZE = 25

export function SessionTable({ sessions }: { sessions: UserSession[] }) {
  const [query, setQuery] = useState("")
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sessions.filter((session) => {
      if (onlyOpen && session.status !== "active") return false
      if (!q) return true
      return [session.account, session.ip, session.computer, session.logonTypeName, session.status]
        .join(" ")
        .toLowerCase()
        .includes(q)
    })
  }, [sessions, query, onlyOpen])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const slice = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setPage(0)
          }}
          placeholder="Search user, IP, host..."
          className="max-w-md"
        />
        <Button
          size="sm"
          variant={onlyOpen ? "default" : "outline"}
          onClick={() => {
            setOnlyOpen((value) => !value)
            setPage(0)
          }}
        >
          Open now
        </Button>
      </div>
      <div className="rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Logon</TableHead>
              <TableHead>Logoff</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Host</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((session) => (
              <TableRow key={session.id}>
                <TableCell>
                  <AccountLink account={session.account} domain={session.domain} />
                  {session.elevated ? (
                    <Badge variant="destructive" className="ml-2">
                      privileged
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="font-mono text-xs">{formatDateTime(session.start)}</TableCell>
                <TableCell className="font-mono text-xs">{formatDateTime(session.end)}</TableCell>
                <TableCell className="font-mono">{formatDuration(session.durationMs)}</TableCell>
                <TableCell>
                  <LogonTypeBadge name={session.logonTypeName} />
                </TableCell>
                <TableCell className="font-mono text-xs">{session.ip || session.workstation || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{session.computer}</TableCell>
                <TableCell>
                  <Badge variant={session.status === "active" ? "default" : "secondary"}>
                    {session.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <p>{filtered.length} sessions · click a user to see their full history</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={current <= 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span>
            {current + 1} / {pages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={current >= pages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
