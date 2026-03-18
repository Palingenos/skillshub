import "dotenv/config";
import { createDb } from "./client.js";
import { sql } from "drizzle-orm";

async function main() {
  const db = createDb();

  // Tag distribution — what do we have?
  const tags = await db.execute(sql`
    SELECT unnest(tags) as tag, count(*)::int as cnt
    FROM skills WHERE is_published = true AND array_length(tags, 1) > 0
    GROUP BY tag ORDER BY cnt DESC LIMIT 40
  `);
  console.log("=== TOP TAGS (catalog coverage) ===");
  tags.rows.forEach((r: any) => {
    const bar = '█'.repeat(Math.min(40, Math.floor(r.cnt / 10)));
    console.log(`  ${r.tag.padEnd(18)} ${String(r.cnt).padStart(4)} ${bar}`);
  });

  // What's MISSING? Common dev topics with few/no skills
  const gaps = [
    'graphql', 'redis', 'mongodb', 'elasticsearch', 'kafka',
    'rabbitmq', 'grpc', 'websocket', 'oauth', 'jwt',
    'nginx', 'apache', 'ci-cd', 'github-actions', 'gitlab',
    'webpack', 'vite', 'esbuild', 'rollup',
    'sass', 'less', 'styled-components', 'emotion',
    'three.js', 'webgl', 'canvas', 'svg',
    'electron', 'tauri', 'pwa',
    'microservices', 'event-driven', 'cqrs', 'ddd',
    'oauth2', 'saml', 'openid',
    'pandas', 'numpy', 'scikit-learn', 'pytorch', 'tensorflow',
    'jupyter', 'matplotlib', 'seaborn',
    'selenium', 'puppeteer', 'cypress', 'playwright',
    'jest', 'vitest', 'mocha',
    'storybook', 'chromatic',
    'figma', 'sketch',
    'unity', 'godot', 'unreal',
    'solidity', 'hardhat', 'foundry',
    'swift', 'kotlin', 'flutter', 'dart',
    'c++', 'cmake', 'conan',
  ];

  console.log("\n=== CATALOG GAPS (search by name/desc) ===");
  for (const term of gaps) {
    const [r] = (await db.execute(sql`
      SELECT count(*)::int as cnt FROM skills
      WHERE is_published = true
      AND (name ILIKE ${'%' + term + '%'} OR description ILIKE ${'%' + term + '%'})
    `)).rows as any[];
    const status = r.cnt === 0 ? '❌ MISSING' : r.cnt < 3 ? '⚠️  LOW' : '✅';
    if (r.cnt < 5) console.log(`  ${status} ${term}: ${r.cnt} skills`);
  }

  // Repo coverage by owner
  const owners = await db.execute(sql`
    SELECT r.github_owner, count(DISTINCT s.id)::int as skills, count(DISTINCT r.id)::int as repos
    FROM skills s JOIN repos r ON s.repo_id = r.id
    WHERE s.is_published = true
    GROUP BY r.github_owner ORDER BY skills DESC LIMIT 20
  `);
  console.log("\n=== TOP CONTRIBUTORS ===");
  owners.rows.forEach((r: any) => console.log(`  ${r.github_owner}: ${r.skills} skills, ${r.repos} repos`));

  process.exit(0);
}
main();
