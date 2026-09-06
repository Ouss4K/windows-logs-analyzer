import { AlertList } from "@/components/alert-list"
import { DemoBanner } from "@/components/demo-banner"
import { PageHeader } from "@/components/page-header"
import { getInvestigation } from "@/lib/investigation"

export const dynamic = "force-dynamic"

export default async function AlertsPage() {
  const { alerts, stats } = await getInvestigation()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description="Filter by severity, then open the user. Rules cover brute force, password spray, lockouts, after-hours, new sources, public RDP, and admin-group changes."
      />
      <DemoBanner demo={stats.demo} empty={stats.totalEvents === 0} />
      <AlertList alerts={alerts} />
    </div>
  )
}
