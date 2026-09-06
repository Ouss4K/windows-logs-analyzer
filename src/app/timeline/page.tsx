import { DemoBanner } from "@/components/demo-banner"
import { EventTable } from "@/components/event-table"
import { PageHeader } from "@/components/page-header"
import { getInvestigation } from "@/lib/investigation"

export const dynamic = "force-dynamic"

export default async function TimelinePage() {
  const { events, stats } = await getInvestigation()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timeline"
        description="Every normalized Security event in the store, newest first. Search across users, IPs, hosts, and event IDs."
      />
      <DemoBanner demo={stats.demo} empty={stats.totalEvents === 0} />
      <EventTable events={[...events].reverse()} />
    </div>
  )
}
