"use client"

import Link from "next/link"
import { accountHref } from "@/lib/flags"
import { cn } from "@/lib/utils"

export function AccountLink({
  account,
  domain,
  className,
}: {
  account: string
  domain?: string
  className?: string
}) {
  if (!account) return <span className="text-muted-foreground">—</span>
  return (
    <Link
      href={accountHref(account)}
      className={cn("font-mono text-xs text-primary hover:underline", className)}
      onClick={(event) => event.stopPropagation()}
    >
      {domain ? `${domain}\\` : ""}
      {account}
    </Link>
  )
}
