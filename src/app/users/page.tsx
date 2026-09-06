import { DemoBanner } from "@/components/demo-banner"
import { PageHeader } from "@/components/page-header"
import { UserTable } from "@/components/user-table"
import { getInvestigation } from "@/lib/investigation"

export const dynamic = "force-dynamic"

export default async function UsersPage() {
  const { users, stats } = await getInvestigation()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Every account in the logs, ranked by risk. Open a name to see first/last logon, session time, failures, and alerts."
      />
      <DemoBanner demo={stats.demo} empty={stats.totalEvents === 0} />
      <UserTable users={users} />
    </div>
  )
}
