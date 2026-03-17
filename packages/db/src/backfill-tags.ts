import "dotenv/config";
import { createDb } from "./client.js";
import { skills } from "./schema.js";
import { eq, sql } from "drizzle-orm";

const db = createDb();

function autoGenerateTags(name: string, description: string): string[] {
  const tags: string[] = [];
  const text = (name + " " + description).toLowerCase();

  const tagKeywords: Record<string, string[]> = {
    ai: ["ai", "artificial intelligence", "machine learning", "ml", "llm", "gpt", "claude", "openai"],
    mcp: ["mcp", "model context protocol"],
    frontend: ["react", "vue", "angular", "nextjs", "next.js", "frontend", "css", "tailwind", "ui"],
    backend: ["api", "rest", "graphql", "server", "backend", "express", "fastapi", "django"],
    devops: ["docker", "kubernetes", "k8s", "ci/cd", "deploy", "infrastructure", "terraform", "aws", "gcp", "azure"],
    database: ["database", "sql", "postgres", "mongodb", "redis", "supabase", "drizzle"],
    security: ["security", "auth", "authentication", "encryption", "vulnerability", "pentest"],
    testing: ["test", "testing", "jest", "pytest", "cypress", "playwright"],
    mobile: ["mobile", "ios", "android", "react native", "flutter", "expo"],
    python: ["python", "pip", "django", "flask", "fastapi"],
    typescript: ["typescript", "ts", "deno", "bun"],
    rust: ["rust", "cargo", "wasm"],
    data: ["data", "analytics", "pandas", "etl", "pipeline", "scraping"],
    coding: ["code", "coding", "refactor", "debug", "review", "programming"],
    writing: ["writing", "documentation", "docs", "markdown", "blog", "content"],
    design: ["design", "figma", "ui/ux", "prototype"],
    agent: ["agent", "autonomous", "workflow", "orchestrat", "multi-agent"],
  };

  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    if (keywords.some((kw) => text.includes(kw))) {
      tags.push(tag);
    }
  }

  return tags.slice(0, 10);
}

async function main() {
  console.log("🏷️  Backfilling tags for skills with empty tags...\n");

  const emptyTagSkills = await db
    .select({ id: skills.id, name: skills.name, description: skills.description })
    .from(skills)
    .where(sql`${skills.tags} = '{}'`);

  console.log(`Found ${emptyTagSkills.length} skills with empty tags.\n`);

  let updated = 0;
  for (const skill of emptyTagSkills) {
    const newTags = autoGenerateTags(skill.name, skill.description ?? "");
    if (newTags.length === 0) {
      console.log(`  ⏭️  ${skill.name} — no tags could be generated`);
      continue;
    }

    await db.update(skills).set({ tags: newTags }).where(eq(skills.id, skill.id));
    updated++;
    console.log(`  ✅ ${skill.name} → [${newTags.join(", ")}]`);
  }

  console.log(`\n🎉 Done! Updated ${updated} of ${emptyTagSkills.length} skills.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
