"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AlertTriangle,
  Clock3,
  FileBarChart,
  LayoutDashboard,
  LogIn,
  Menu,
  Network,
  Shield,
  Timer,
  Upload,
  Users,
  XCircle,
} from "lucide-react"
import { GlobalSearch } from "@/components/global-search"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/users", label: "People", icon: Users },
  { href: "/logons", label: "Sign-ins", icon: LogIn },
  { href: "/sessions", label: "Time on PC", icon: Timer },
  { href: "/failures", label: "Could not sign in", icon: XCircle },
  { href: "/alerts", label: "Warnings", icon: AlertTriangle },
  { href: "/sources", label: "Where from", icon: Network },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/timeline", label: "Everything", icon: Clock3 },
  { href: "/ingest", label: "Read this PC", icon: Upload },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function AppShell({ children, host }: { children: React.ReactNode; host: string }) {
  return (
    <div className="flex min-h-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r bg-sidebar p-4 print:hidden md:flex">
        <div className="mb-6 flex items-center gap-2 px-1">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="size-4" />
          </div>
          <div>
            <p className="font-heading text-sm font-medium">Windows Logs Analyzer</p>
            <p className="font-mono text-[11px] text-muted-foreground">This PC · {host}</p>
          </div>
        </div>
        <NavLinks />
        <div className="mt-auto space-y-3">
          <Separator />
          <p className="px-1 text-xs leading-relaxed text-muted-foreground">
            Local only. What happened on this PC stays here. Search with Ctrl+K.
          </p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b px-4 py-3 print:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-sm" className="md:hidden" aria-label="Open navigation">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <SheetHeader>
                <SheetTitle>Windows Logs Analyzer</SheetTitle>
                <p className="font-mono text-xs text-muted-foreground">This PC · {host}</p>
              </SheetHeader>
              <div className="mt-4">
                <NavLinks />
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-heading text-sm font-medium md:hidden">Windows Logs Analyzer</span>
          <div className="min-w-0 flex-1">
            <GlobalSearch />
          </div>
          <Button asChild size="sm" className="ml-auto md:ml-0">
            <Link href="/ingest">This PC</Link>
          </Button>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
