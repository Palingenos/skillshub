import "dotenv/config";
import { createDb } from "./client.js";
import { sql } from "drizzle-orm";

async function main() {
  const db = createDb();

  // Check registered agents
  const agents = await db.execute(sql`SELECT username, role, created_at FROM users WHERE role = 'agent' ORDER BY created_at DESC LIMIT 10`);
  console.log("=== Registered Agents ===");
  agents.rows.forEach((r: any) => console.log(`  ${r.username} (${r.role}) — ${r.created_at}`));

  // Check feedback
  const feedback = await db.execute(sql`SELECT sf.task, sf.helpful, sf.context, s.name as skill_name, sf.created_at FROM skill_feedback sf JOIN skills s ON sf.skill_id = s.id ORDER BY sf.created_at DESC LIMIT 10`);
  console.log(`\n=== Feedback (${feedback.rows.length} entries) ===`);
  feedback.rows.forEach((r: any) => console.log(`  ${r.helpful ? '✅' : '❌'} ${r.skill_name} — "${r.task}" (${r.context})`));

  // Check events
  const events = await db.execute(sql`SELECT event_type, count(*)::int as cnt FROM skill_events GROUP BY event_type`);
  console.log(`\n=== Events ===`);
  events.rows.forEach((r: any) => console.log(`  ${r.event_type}: ${r.cnt}`));

  // Check fetch counts
  const fetched = await db.execute(sql`SELECT s.name, s.fetch_count FROM skills s WHERE s.fetch_count > 0 ORDER BY s.fetch_count DESC LIMIT 10`);
  console.log(`\n=== Top Fetched Skills ===`);
  fetched.rows.forEach((r: any) => console.log(`  ${r.name}: ${r.fetch_count} fetches`));

  // Check API keys
  const keys = await db.execute(sql`SELECT u.username, ak.name, ak.last_used_at FROM api_keys ak JOIN users u ON ak.user_id = u.id ORDER BY ak.created_at DESC LIMIT 10`);
  console.log(`\n=== API Keys ===`);
  keys.rows.forEach((r: any) => console.log(`  ${r.username} — key "${r.name}" last used: ${r.last_used_at}`));

  process.exit(0);
}
main().catch(console.error);
