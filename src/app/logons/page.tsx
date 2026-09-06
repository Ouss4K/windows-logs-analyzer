import { isSuccessfulLogon } from "@/lib/analytics"
import { DemoBanner } from "@/components/demo-banner"
import { EventTable } from "@/components/event-table"
import { PageHeader } from "@/components/page-header"
import { getInvestigation } from "@/lib/investigation"

export const dynamic = "force-dynamic"

export default async function LogonsPage() {
  const { events, stats } = await getInvestigation()
  const logons = events.filter((event) => isSuccessfulLogon(event) || event.eventId === 4648).reverse()

  return (
    <div className="space-y-6">
      <PageHeader
        title="User connections"
        description="Successful logons. Filter by RDP, after hours, or last 24 hours. Click a row for details, or a user name for their full history."
      />
      <DemoBanner demo={stats.demo} empty={stats.totalEvents === 0} />
      <EventTable events={logons} empty="No successful logons in the current store." />
    </div>
  )
}
