import "dotenv/config";
import { createDb } from "./client.js";
import { skills } from "./schema.js";
import { sql, eq } from "drizzle-orm";

/**
 * Clean tags by removing tags that don't match the skill's name or description.
 * A tag is only valid if the tag keyword appears in name OR description.
 * This removes "grey area" tags from the readme-based tagger.
 */

const TAG_VALIDATORS: Record<string, string[]> = {
  'docker': ['docker', 'container', 'dockerfile'],
  'kubernetes': ['kubernetes', 'k8s', 'helm', 'kubectl'],
  'ios': ['ios ', 'swiftui', 'uikit', 'iphone', 'ipad'],
  'android': ['android', 'jetpack', 'kotlin'],
  'react': ['react', 'jsx', 'nextjs', 'next.js'],
  'vue': ['vue', 'nuxt', 'vuex'],
  'python': ['python', 'pip', 'pytest', 'django', 'flask', 'fastapi', 'pandas', 'uv '],
  'rust': ['rust', 'cargo'],
  'go': ['golang', ' go '],
  'swift': ['swift', 'swiftui', 'xcode'],
  'terraform': ['terraform', 'opentofu', 'hcl'],
  'aws': ['aws', 'amazon', 'ec2', 's3 ', 'lambda'],
  'azure': ['azure'],
  'pandas': ['pandas', 'dataframe'],
  'mobile': ['mobile', 'ios', 'android', 'react native', 'flutter', 'expo'],
};

async function main() {
  const db = createDb();

  const allSkills = await db.select({
    id: skills.id,
    name: skills.name,
    description: skills.description,
    tags: skills.tags,
  }).from(skills).where(sql`array_length(tags, 1) > 0`);

  console.log(`Checking ${allSkills.length} skills for tag validity...\n`);

  let cleaned = 0;
  let tagsRemoved = 0;

  for (const skill of allSkills) {
    const text = ((skill.name || '') + ' ' + (skill.description || '')).toLowerCase();
    const oldTags = skill.tags || [];
    const newTags: string[] = [];

    for (const tag of oldTags) {
      const validators = TAG_VALIDATORS[tag];
      if (!validators) {
        // No validator for this tag — keep it (it's a generic tag like 'coding', 'writing')
        newTags.push(tag);
        continue;
      }
      // Check if any validator keyword appears in name+description
      if (validators.some(kw => text.includes(kw))) {
        newTags.push(tag);
      } else {
        tagsRemoved++;
      }
    }

    if (newTags.length < oldTags.length) {
      await db.update(skills).set({ tags: newTags }).where(eq(skills.id, skill.id));
      cleaned++;
      if (cleaned <= 5) {
        const removed = oldTags.filter(t => !newTags.includes(t));
        console.log(`  ${skill.name}: removed [${removed.join(', ')}]`);
      }
    }
  }

  console.log(`\n=== Results ===`);
  console.log(`Skills cleaned: ${cleaned}`);
  console.log(`Tags removed: ${tagsRemoved}`);

  process.exit(0);
}
main().catch(console.error);
