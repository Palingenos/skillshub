import "dotenv/config";
import { createDb } from "./client.js";
import { skills, repos } from "./schema.js";
import { eq, sql } from "drizzle-orm";

async function main() {
  const db = createDb();

  // Find repos with suspiciously many tags per skill
  const spammy = await db.execute(sql`
    SELECT r.github_owner, r.github_repo_name,
      count(*)::int as skill_count,
      avg(array_length(s.tags, 1))::numeric(4,1) as avg_tags,
      max(array_length(s.tags, 1)) as max_tags
    FROM skills s JOIN repos r ON s.repo_id = r.id
    WHERE array_length(s.tags, 1) > 4
    GROUP BY r.github_owner, r.github_repo_name
    ORDER BY avg_tags DESC LIMIT 15
  `);
  console.log("=== Repos with high avg tags ===");
  spammy.rows.forEach((r: any) => console.log(`  ${r.github_owner}/${r.github_repo_name}: ${r.skill_count} skills, avg ${r.avg_tags} tags`));

  // Find skills tagged 'docker' without docker in name/desc
  const dockerSpam = await db.execute(sql`
    SELECT s.name, s.tags, r.github_owner, r.github_repo_name,
      substring(s.description, 1, 60) as desc_short
    FROM skills s JOIN repos r ON s.repo_id = r.id
    WHERE 'docker' = ANY(s.tags)
    AND s.name NOT ILIKE '%docker%'
    AND coalesce(s.description,'') NOT ILIKE '%docker%'
    LIMIT 10
  `);
  console.log("\n=== 'docker' tag spam (no docker in name/desc) ===");
  dockerSpam.rows.forEach((r: any) => console.log(`  ${r.github_owner}/${r.name}: "${r.desc_short}" tags=${(r.tags as string[]).slice(0,6)}`));

  // Find skills tagged 'ios' without ios/swift in name/desc
  const iosSpam = await db.execute(sql`
    SELECT s.name, s.tags, r.github_owner,
      substring(s.description, 1, 60) as desc_short
    FROM skills s JOIN repos r ON s.repo_id = r.id
    WHERE 'ios' = ANY(s.tags)
    AND s.name NOT ILIKE '%ios%' AND s.name NOT ILIKE '%swift%'
    AND coalesce(s.description,'') NOT ILIKE '%ios%' AND coalesce(s.description,'') NOT ILIKE '%swift%'
    LIMIT 10
  `);
  console.log("\n=== 'ios' tag spam ===");
  iosSpam.rows.forEach((r: any) => console.log(`  ${r.github_owner}/${r.name}: "${r.desc_short}"`));

  process.exit(0);
}
main();
