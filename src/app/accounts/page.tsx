import { DemoBanner } from "@/components/demo-banner"
import { EventTable } from "@/components/event-table"
import { PageHeader } from "@/components/page-header"
import { getInvestigation } from "@/lib/investigation"

export const dynamic = "force-dynamic"

const ACCOUNT_IDS = new Set([
  4720, 4722, 4723, 4724, 4725, 4726, 4732, 4733, 4728, 4729, 4738, 4740, 4756, 4767, 4781,
])

export default async function AccountsPage() {
  const { events, stats } = await getInvestigation()
  const accountEvents = events.filter((event) => ACCOUNT_IDS.has(event.eventId)).reverse()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account changes"
        description="Creates, enables, disables, deletes, password resets, lockouts, unlocks, and group membership changes — the Active Directory trail Netwrix reports from."
      />
      <DemoBanner demo={stats.demo} empty={stats.totalEvents === 0} />
      <EventTable events={accountEvents} empty="No account-management events in the current store." />
    </div>
  )
}
