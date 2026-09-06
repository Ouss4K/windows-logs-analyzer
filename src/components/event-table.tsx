"use client"

import { useMemo, useState } from "react"
import { AccountLink } from "@/components/account-link"
import { EventDetail } from "@/components/event-detail"
import { CategoryBadge, LogonTypeBadge } from "@/components/status-badges"
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
import { datasetEnd, isAfterHours, withinRange } from "@/lib/flags"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { LogEvent } from "@/lib/types"

const PAGE_SIZE = 25
type Chip = "all" | "rdp" | "interactive" | "after-hours" | "privileged" | "failed"
type Range = "24h" | "7d" | "14d" | "all"

export function EventTable({
  events,
  empty = "No events in this view.",
}: {
  events: LogEvent[]
  empty?: string
}) {
  const [query, setQuery] = useState("")
  const [chip, setChip] = useState<Chip>("all")
  const [range, setRange] = useState<Range>("all")
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<LogEvent | null>(null)
  const endMs = useMemo(() => datasetEnd(events.map((event) => event.time)), [events])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events.filter((event) => {
      if (!withinRange(event.time, range, endMs)) return false
      if (chip === "rdp" && event.logonType !== 10) return false
      if (chip === "interactive" && ![2, 7, 10, 11].includes(event.logonType ?? -1)) return false
      if (chip === "after-hours" && !isAfterHours(event.time)) return false
      if (chip === "privileged" && !event.elevated && event.eventId !== 4672) return false
      if (chip === "failed" && event.eventId !== 4625 && event.eventId !== 4771) return false
      if (!q) return true
      return [
        event.account,
        event.targetAccount,
        event.ip,
        event.computer,
        event.workstation,
        event.title,
        String(event.eventId),
        event.failureReason,
        event.logonTypeName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    })
  }, [events, query, chip, range, endMs])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const slice = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)

  function updateChip(next: Chip) {
    setChip(next)
    setPage(0)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setPage(0)
          }}
          placeholder="Search user, IP, host, event ID..."
          className="max-w-md"
        />
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["all", "All"],
              ["rdp", "RDP"],
              ["interactive", "Interactive"],
              ["after-hours", "After hours"],
              ["privileged", "Privileged"],
              ["failed", "Failed"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              size="sm"
              variant={chip === id ? "default" : "outline"}
              onClick={() => updateChip(id)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          {(
            [
              ["24h", "24h"],
              ["7d", "7d"],
              ["14d", "14d"],
              ["all", "All time"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              size="sm"
              variant={range === id ? "secondary" : "ghost"}
              onClick={() => {
                setRange(id)
                setPage(0)
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <div className="rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Host</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  {empty}
                </TableCell>
              </TableRow>
            ) : (
              slice.map((event) => (
                <TableRow
                  key={event.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(event)}
                >
                  <TableCell className="font-mono text-xs">{formatDateTime(event.time)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{event.title}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{event.eventId}</span>
                        <CategoryBadge category={event.category} />
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <AccountLink account={event.account || event.targetAccount} domain={event.domain} />
                  </TableCell>
                  <TableCell>
                    <LogonTypeBadge name={event.logonTypeName} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {event.ip || event.workstation || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{event.computer}</TableCell>
                  <TableCell className={cn("max-w-56 truncate text-muted-foreground")}>
                    {event.failureReason || event.authPackage || event.processName || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>
          {filtered.length} events · click a row for details
        </p>
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
      <EventDetail event={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
