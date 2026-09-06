import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AlertSeverity, EventCategory } from "@/lib/types"

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <Badge
      variant={severity === "critical" || severity === "high" ? "destructive" : "secondary"}
      className={cn(
        severity === "medium" && "bg-amber-500/15 text-amber-300",
        severity === "low" && "bg-primary/15 text-primary",
      )}
    >
      {severity}
    </Badge>
  )
}

export function CategoryBadge({ category }: { category: EventCategory }) {
  return <Badge variant="outline">{category}</Badge>
}

export function LogonTypeBadge({ name }: { name: string }) {
  if (!name) return <span className="text-muted-foreground">—</span>
  const rdp = name.includes("RDP") || name.includes("Remote")
  return (
    <Badge variant={rdp ? "default" : "secondary"} className="font-normal">
      {name}
    </Badge>
  )
}
