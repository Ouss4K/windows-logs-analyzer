"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { accountHref } from "@/lib/flags"

const PAGES = [
  { href: "/", label: "Overview" },
  { href: "/users", label: "Users" },
  { href: "/logons", label: "User connections" },
  { href: "/sessions", label: "Account log time" },
  { href: "/failures", label: "Failed logons" },
  { href: "/alerts", label: "Alerts" },
  { href: "/accounts", label: "Account changes" },
  { href: "/sources", label: "IPs & workstations" },
  { href: "/reports", label: "Reports" },
  { href: "/ingest", label: "Collect & import" },
]

type IndexPayload = {
  users: { account: string; domain: string; riskScore: number }[]
  events: { id: string; title: string; account: string; time: string; eventId: number }[]
}

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [index, setIndex] = useState<IndexPayload | null>(null)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    void fetch("/api/index")
      .then((response) => response.json())
      .then((payload: IndexPayload) => setIndex(payload))
      .catch(() => setIndex({ users: [], events: [] }))
  }, [open])

  const q = query.trim().toLowerCase()
  const users = useMemo(
    () =>
      (index?.users ?? [])
        .filter((user) => !q || user.account.toLowerCase().includes(q))
        .slice(0, 8),
    [index, q],
  )
  const events = useMemo(
    () =>
      (index?.events ?? [])
        .filter(
          (event) =>
            !q ||
            event.account.toLowerCase().includes(q) ||
            event.title.toLowerCase().includes(q) ||
            String(event.eventId).includes(q),
        )
        .slice(0, 8),
    [index, q],
  )
  const pages = PAGES.filter((page) => !q || page.label.toLowerCase().includes(q))

  function go(href: string) {
    setOpen(false)
    setQuery("")
    router.push(href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full max-w-sm items-center justify-between rounded-lg border border-input bg-input/30 px-2.5 text-sm text-muted-foreground"
      >
        Search users and events...
        <kbd className="rounded border px-1.5 font-mono text-[10px]">Ctrl K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Find a user, event, or page">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search users, events, pages..." value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup heading="Pages">
              {pages.map((page) => (
                <CommandItem key={page.href} value={page.label} onSelect={() => go(page.href)}>
                  {page.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {users.length > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup heading="Users">
                  {users.map((user) => (
                    <CommandItem
                      key={user.account}
                      value={user.account}
                      onSelect={() => go(accountHref(user.account))}
                    >
                      <span className="font-mono">{user.account}</span>
                      <span className="ml-auto text-xs text-muted-foreground">risk {user.riskScore}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}
            {events.length > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup heading="Events">
                  {events.map((event) => (
                    <CommandItem
                      key={event.id}
                      value={`${event.eventId} ${event.account} ${event.title}`}
                      onSelect={() => go(event.account ? accountHref(event.account) : "/timeline")}
                    >
                      <span>
                        {event.eventId} {event.title}
                      </span>
                      <span className="ml-auto font-mono text-xs text-muted-foreground">{event.account}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
