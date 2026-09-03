import { getDb } from "@/lib/db"
import { authUsers } from "@/lib/db/schema"
import { getAnalytics } from "@/lib/analytics"

const users = await getDb().select({ id: authUsers.id, email: authUsers.email }).from(authUsers).all()
for (const user of users) {
  const summary = await getAnalytics(user.id, "all")
  if (summary.kpis.total === 0) continue
  console.log("\n=== " + user.email + " ===")
  console.log("KPIs      ", JSON.stringify({ ...summary.kpis, perDay: `${summary.kpis.perDay.length} days` }))
  console.log("statuses  ", JSON.stringify(summary.statuses))
  console.log("failures  ", JSON.stringify(summary.failures, null, 1))
  console.log("latency   ", JSON.stringify(summary.latency, null, 1))
  console.log("models    ", JSON.stringify(summary.models, null, 1))
  console.log("sources   ", JSON.stringify(summary.breakdowns.sources))
  console.log("modes     ", JSON.stringify(summary.breakdowns.modes))
  console.log("agents    ", JSON.stringify(summary.breakdowns.agents))
  console.log("throughput", summary.breakdowns.throughput.length, "days, last:", JSON.stringify(summary.breakdowns.throughput.slice(-3)))
  console.log("evidence  ", JSON.stringify({ ...summary.evidence, perDay: `${summary.evidence.perDay.length} days` }, null, 1))
  console.log("apps      ", JSON.stringify(summary.apps, null, 1))
}
process.exit(0)
