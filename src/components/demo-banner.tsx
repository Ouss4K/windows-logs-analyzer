import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export function DemoBanner({ demo, empty }: { demo: boolean; empty: boolean }) {
  if (empty) {
    return (
      <Alert>
        <AlertTitle>No events loaded</AlertTitle>
        <AlertDescription>
          Collect the Security log from this PC, or import an .evtx file. Run the app as Administrator if Windows blocks the Security log.
          <Button asChild size="sm" className="mt-3">
            <Link href="/ingest">Open collector</Link>
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
  if (!demo) return null
  return (
    <Alert>
      <AlertTitle>Sample investigation</AlertTitle>
      <AlertDescription>
        You are viewing generated CORP.local sample data. Collect this PC to replace it with real local logs.
      </AlertDescription>
    </Alert>
  )
}
