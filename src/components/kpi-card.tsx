import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
  href,
}: {
  label: string
  value: string | number
  hint?: string
  tone?: "default" | "danger" | "warn" | "ok"
  href?: string
}) {
  const inner = (
    <Card size="sm" className={href ? "transition-colors hover:bg-muted/40" : undefined}>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={cn(
            "font-mono text-2xl tracking-tight",
            tone === "danger" && "text-destructive",
            tone === "warn" && "text-amber-400",
            tone === "ok" && "text-primary",
          )}
        >
          {value}
        </CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  )
  if (!href) return inner
  return <Link href={href}>{inner}</Link>
}
