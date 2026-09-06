"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AccountLink } from "@/components/account-link"
import { SeverityBadge } from "@/components/status-badges"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTime } from "@/lib/format"
import { accountHref } from "@/lib/flags"
import type { Alert, AlertSeverity } from "@/lib/types"

const FILTERS: (AlertSeverity | "all")[] = ["all", "critical", "high", "medium", "low"]

export function AlertList({ alerts }: { alerts: Alert[] }) {
  const [severity, setSeverity] = useState<(typeof FILTERS)[number]>("all")
  const filtered = useMemo(
    () => (severity === "all" ? alerts : alerts.filter((alert) => alert.severity === severity)),
    [alerts, severity],
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((id) => (
          <Button key={id} size="sm" variant={severity === id ? "default" : "outline"} onClick={() => setSeverity(id)}>
            {id === "all" ? "All" : id}
          </Button>
        ))}
      </div>
      <div className="grid gap-3">
        {filtered.map((alert) => (
          <Card key={alert.id} size="sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{alert.title}</CardTitle>
                <SeverityBadge severity={alert.severity} />
              </div>
              <CardDescription>
                {alert.rule.replaceAll("_", " ")} · {formatDateTime(alert.time)} · {alert.count} related events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{alert.description}</p>
              <p className="font-mono text-xs">
                <AccountLink account={alert.account.split(",")[0]?.trim() ?? ""} /> · {alert.ip || "no IP"} ·{" "}
                {alert.computer}
              </p>
              {alert.account && !alert.account.includes(",") ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={accountHref(alert.account)}>Investigate user</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No detections in this filter.</p>
        ) : null}
      </div>
    </div>
  )
}
