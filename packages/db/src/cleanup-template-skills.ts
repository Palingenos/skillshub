import "dotenv/config";
import { createDb } from "./client.js";
import { skills, skillEvents, skillFeedback } from "./schema.js";
import { eq, or, sql, inArray } from "drizzle-orm";

/**
 * Remove obvious template/placeholder skills.
 *
 * Criteria (conservative — all conditions must hold):
 *   1. slug is exactly 'template', 'template-skill', or 'skill-template'
 *   2. AND at least one of:
 *      a. description contains 'Replace with description'
 *      b. description contains 'placeholder'
 *      c. tags array is empty AND readme length < 200
 */
async function main() {
  const db = createDb();

  const templateSlugs = ["template", "template-skill", "skill-template"];

  // First, find matching rows so we can review before deleting
  const candidates = await db
    .select({
      id: skills.id,
      slug: skills.slug,
      name: skills.name,
      description: skills.description,
      tags: skills.tags,
      readmeLength: sql<number>`coalesce(length(${skills.readme}), 0)::int`,
    })
    .from(skills)
    .where(
      or(
        ...templateSlugs.map((s) => eq(skills.slug, s)),
      ),
    );

  console.log(`Found ${candidates.length} skills with template slugs.\n`);

  const toDelete: string[] = [];

  for (const row of candidates) {
    const desc = (row.description ?? "").toLowerCase();
    const hasPlaceholderDesc =
      desc.includes("replace with description") || desc.includes("placeholder");
    const isBareBones =
      row.tags.length === 0 && row.readmeLength < 200;

    if (hasPlaceholderDesc || isBareBones) {
      toDelete.push(row.id);
      console.log(
        `  WILL DELETE: slug=${row.slug}  name="${row.name}"  ` +
          `desc="${(row.description ?? "").slice(0, 60)}..."  ` +
          `tags=[${row.tags.join(",")}]  readmeLen=${row.readmeLength}`,
      );
    } else {
      console.log(
        `  KEEPING:     slug=${row.slug}  name="${row.name}"  ` +
          `(does not match placeholder criteria)`,
      );
    }
  }

  if (toDelete.length === 0) {
    console.log("\nNothing to delete.");
    process.exit(0);
  }

  console.log(`\nDeleting ${toDelete.length} template skill(s)...`);

  // Delete referencing rows first (FK constraints may lack ON DELETE CASCADE)
  await db.delete(skillEvents).where(inArray(skillEvents.skillId, toDelete));
  await db.delete(skillFeedback).where(inArray(skillFeedback.skillId, toDelete));

  const deleted = await db
    .delete(skills)
    .where(inArray(skills.id, toDelete))
    .returning({ id: skills.id, slug: skills.slug });

  console.log(`Deleted ${deleted.length} skill(s):`);
  for (const d of deleted) {
    console.log(`  - ${d.slug} (${d.id})`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
