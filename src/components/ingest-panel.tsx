"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function IngestPanel() {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState("14")
  const [merge, setMerge] = useState(false)

  async function run(kind: string, request: () => Promise<Response>) {
    setBusy(kind)
    setError(null)
    setMessage(null)
    try {
      const response = await request()
      const payload = (await response.json()) as {
        error?: string
        eventCount?: number
        imported?: number
        warning?: string
      }
      if (!response.ok) throw new Error(payload.error || "Request failed")
      setMessage(
        payload.imported != null
          ? `Imported ${payload.imported} events. Store now has ${payload.eventCount}.`
          : `Loaded ${payload.eventCount} events.`,
      )
      if (payload.warning) setError(payload.warning)
      router.refresh()
      if (kind !== "clear") router.push("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTitle>Start here</AlertTitle>
        <AlertDescription>
          Pick this PC first. Import an .evtx only if you need another machine’s log. Sample data is optional.
        </AlertDescription>
      </Alert>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Step 1</CardDescription>
            <CardTitle>This Windows PC</CardTitle>
            <CardDescription>
              Reads logon, session, and account events from this computer. Run as Administrator to include the Security log.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="days">How many days back?</Label>
              <Input
                id="days"
                value={days}
                onChange={(event) => setDays(event.target.value)}
                className="max-w-24"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={merge} onChange={(event) => setMerge(event.target.checked)} />
              Keep existing events and add these
            </label>
            <Button
              className="w-full"
              disabled={busy !== null}
              onClick={() =>
                run("live", () =>
                  fetch("/api/ingest/live", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ days: Number(days) || 14, merge }),
                  }),
                )
              }
            >
              {busy === "live" ? "Collecting..." : "Collect this PC"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Step 2</CardDescription>
            <CardTitle>Import an .evtx file</CardTitle>
            <CardDescription>
              From Event Viewer: save the Security log, then choose that file here. Works for a DC or another PC.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="file"
              accept=".evtx"
              disabled={busy !== null}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                const data = new FormData()
                data.set("file", file)
                data.set("merge", String(merge))
                void run("evtx", () => fetch("/api/ingest/evtx", { method: "POST", body: data }))
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Try it first</CardDescription>
            <CardTitle>Sample investigation</CardTitle>
            <CardDescription>
              Two weeks of CORP.local activity, including RDP, brute force, a lockout, and an admin-group change.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button
              className="w-full"
              disabled={busy !== null}
              onClick={() => run("demo", () => fetch("/api/ingest/demo", { method: "POST" }))}
            >
              {busy === "demo" ? "Loading..." : "Load sample data"}
            </Button>
            <Button
              variant="outline"
              disabled={busy !== null}
              onClick={() => run("clear", () => fetch("/api/ingest/clear", { method: "POST" }))}
            >
              Clear everything
            </Button>
          </CardContent>
        </Card>
      </div>

      {message ? (
        <Alert>
          <AlertTitle>Ingest complete</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Collector message</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
