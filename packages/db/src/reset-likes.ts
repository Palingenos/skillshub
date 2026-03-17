import "dotenv/config";
import { createDb } from "./client.js";
import { repos, stars } from "./schema.js";
import { sql } from "drizzle-orm";

async function main() {
  const db = createDb();

  // Check current state
  const before = await db.execute(sql`SELECT count(*) as star_rows FROM stars`);
  const repoStats = await db.execute(sql`SELECT sum(star_count) as total_likes, count(*) filter (where star_count > 0) as repos_with_likes FROM repos`);
  console.log(`Before: ${before.rows[0].star_rows} star rows, ${repoStats.rows[0].total_likes} total likes across ${repoStats.rows[0].repos_with_likes} repos`);

  // Delete all stars
  await db.delete(stars);
  console.log("Deleted all star rows");

  // Reset all repo star counts to 0
  await db.update(repos).set({ starCount: 0 });
  console.log("Reset all repo starCount to 0");

  // Verify
  const after = await db.execute(sql`SELECT count(*) as star_rows FROM stars`);
  const afterRepos = await db.execute(sql`SELECT sum(star_count) as total_likes FROM repos`);
  console.log(`After: ${after.rows[0].star_rows} star rows, ${afterRepos.rows[0].total_likes} total likes`);

  process.exit(0);
}

main().catch(console.error);
