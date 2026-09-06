"use client"

import { AccountLink } from "@/components/account-link"
import { CategoryBadge, LogonTypeBadge } from "@/components/status-badges"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { formatDateTime } from "@/lib/format"
import type { LogEvent } from "@/lib/types"

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 border-b py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-all font-mono text-xs">{value || "—"}</dd>
    </div>
  )
}

export function EventDetail({
  event,
  onClose,
}: {
  event: LogEvent | null
  onClose: () => void
}) {
  return (
    <Sheet open={event !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        {event ? (
          <>
            <SheetHeader>
              <SheetTitle>{event.title}</SheetTitle>
              <SheetDescription>
                Event {event.eventId} · {formatDateTime(event.time)}
              </SheetDescription>
            </SheetHeader>
            <dl className="px-4 pb-6">
              <Row label="Account" value={<AccountLink account={event.account} domain={event.domain} />} />
              <Row label="Caller" value={event.callerAccount} />
              <Row label="Target" value={event.targetAccount} />
              <Row label="Logon type" value={<LogonTypeBadge name={event.logonTypeName} />} />
              <Row label="Category" value={<CategoryBadge category={event.category} />} />
              <Row label="IP" value={event.ip} />
              <Row label="Workstation" value={event.workstation} />
              <Row label="Host" value={event.computer} />
              <Row label="Logon ID" value={event.logonId} />
              <Row label="Status" value={event.status} />
              <Row label="Failure" value={event.failureReason} />
              <Row label="Auth package" value={event.authPackage} />
              <Row label="Process" value={event.processName} />
              <Row label="Privileges" value={event.privileges} />
              <Row label="Channel" value={event.channel} />
            </dl>
            {event.account ? (
              <div className="px-4 pb-6">
                <Button asChild>
                  <a href={`/users/${encodeURIComponent(event.account)}`}>Open user activity</a>
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
