import "dotenv/config";
import { createDb } from "./client.js";
import { skills } from "./schema.js";
import { eq, sql } from "drizzle-orm";

/**
 * Comprehensive skill tagger — scans name, description, AND readme first 1000 chars.
 * Generates much more specific tags than the original 17-category tagger.
 */

const TAG_RULES: Record<string, string[]> = {
  // Languages
  'python': ['python', 'pip', 'pyproject', 'pytest', 'django', 'flask', 'fastapi', 'pandas', 'numpy', 'scipy', 'pytorch', 'tensorflow', 'jupyter', 'conda', 'uv ', 'ruff', 'mypy', 'pylint'],
  'typescript': ['typescript', ' ts ', 'deno', 'bun ', 'tsx ', 'zod'],
  'javascript': ['javascript', ' js ', 'node.js', 'nodejs', 'npm ', 'express', 'webpack', 'vite '],
  'rust': ['rust', 'cargo', 'wasm', 'webassembly', 'tokio', 'axum'],
  'go': ['golang', ' go ', 'goroutine'],
  'swift': ['swift', 'swiftui', 'xcode', 'ios ', 'uikit', 'cocoa'],
  'java': [' java ', 'spring', 'maven', 'gradle', 'kotlin', 'android'],
  'csharp': ['c#', '.net', 'dotnet', 'blazor', 'asp.net', 'nuget'],
  'ruby': ['ruby', 'rails', 'gems'],
  'php': [' php ', 'laravel', 'composer', 'wordpress'],
  'sql': [' sql', 'postgres', 'mysql', 'sqlite', 'database query', 'drizzle'],
  'shell': ['bash', 'shell', 'zsh', 'cli ', 'command line', 'terminal'],

  // Frameworks
  'react': ['react', 'jsx', 'nextjs', 'next.js', 'remix', 'gatsby'],
  'vue': ['vue', 'nuxt', 'vuex', 'pinia'],
  'angular': ['angular', 'rxjs', 'ngrx'],
  'svelte': ['svelte', 'sveltekit'],
  'django': ['django'],
  'express': ['express', 'koa ', 'hono', 'fastify'],
  'tailwind': ['tailwind', 'tailwindcss'],

  // Domains
  'ai': ['ai ', 'artificial intelligence', 'machine learning', ' ml ', 'llm', 'gpt', 'claude', 'openai', 'anthropic', 'gemini', 'copilot', 'neural', 'deep learning'],
  'ml': ['machine learning', 'model training', 'scikit', 'sklearn', 'tensorflow', 'pytorch', 'hugging face', 'transformers', 'fine-tun'],
  'nlp': ['nlp', 'natural language', 'text processing', 'tokeniz', 'embedding', 'sentiment'],
  'rag': ['rag', 'retrieval augmented', 'vector search', 'embedding', 'langchain', 'llama.?index'],
  'mcp': ['mcp', 'model context protocol'],
  'agent': ['agent', 'autonomous', 'orchestrat', 'multi-agent', 'agentic', 'tool-use', 'tool call'],

  // Infrastructure
  'devops': ['devops', 'ci/cd', 'ci cd', 'pipeline', 'infrastructure', 'iac', 'gitops'],
  'docker': ['docker', 'container', 'dockerfile', 'compose'],
  'kubernetes': ['kubernetes', 'k8s', 'helm', 'kubectl', 'pod ', 'cluster'],
  'terraform': ['terraform', 'opentofu', 'hcl', 'infrastructure as code'],
  'aws': ['aws', 'amazon web services', 's3 ', 'ec2', 'lambda', 'cloudformation', 'dynamodb'],
  'azure': ['azure', 'microsoft cloud', 'arm template', 'bicep'],
  'gcp': ['gcp', 'google cloud', 'bigquery', 'cloud run', 'firebase'],
  'cloudflare': ['cloudflare', 'workers', 'pages'],
  'vercel': ['vercel', 'serverless', 'edge function'],

  // Security
  'security': ['security', 'vulnerability', 'exploit', 'pentest', 'penetration', 'cve ', 'owasp', 'xss', 'csrf', 'injection', 'threat model'],
  'auth': ['auth', 'authentication', 'authorization', 'oauth', 'jwt', 'saml', 'session', 'login'],
  'crypto': ['cryptograph', 'encryption', 'decryption', 'hash', 'signing', 'tls', 'ssl', 'certificate'],
  'audit': ['audit', 'compliance', 'code review', 'static analysis', 'sast', 'dast'],
  'fuzzing': ['fuzz', 'fuzzer', 'fuzzing', 'libfuzzer', 'afl'],

  // Testing
  'testing': ['test', 'testing', 'spec ', 'assertion', 'mock', 'stub'],
  'e2e': ['e2e', 'end-to-end', 'end to end', 'playwright', 'cypress', 'selenium', 'puppeteer'],
  'unit-testing': ['unit test', 'jest', 'vitest', 'pytest', 'mocha', 'chai'],
  'performance': ['performance', 'benchmark', 'load test', 'profil', 'optimization', 'latency'],

  // Data
  'data': ['data', 'analytics', 'etl', 'pipeline', 'warehouse', 'ingestion'],
  'pandas': ['pandas', 'dataframe', 'jupyter', 'notebook'],
  'visualization': ['visualization', 'chart', 'd3', 'plotly', 'grafana', 'dashboard', 'graph'],
  'scraping': ['scraping', 'scraper', 'crawl', 'web scraping', 'beautiful soup', 'cheerio'],

  // Frontend
  'frontend': ['frontend', 'front-end', 'ui ', 'user interface', 'responsive', 'accessibility', 'a11y', 'css'],
  'design': ['design', 'figma', 'ui/ux', 'ux ', 'prototype', 'wireframe', 'mockup'],
  'animation': ['animation', 'motion', 'transition', 'framer', 'gsap', 'manim'],

  // Backend
  'backend': ['backend', 'back-end', 'server', 'api ', 'rest ', 'graphql', 'grpc', 'microservice'],
  'database': ['database', 'postgres', 'mongodb', 'redis', 'supabase', 'dynamodb', 'clickhouse', 'drizzle orm'],

  // Mobile
  'mobile': ['mobile', 'ios', 'android', 'react native', 'flutter', 'expo', 'swift', 'kotlin'],
  'ios': ['ios', 'swiftui', 'uikit', 'xcode', 'apple', 'cocoapods'],
  'android': ['android', 'kotlin', 'jetpack compose', 'gradle'],

  // Web3
  'web3': ['blockchain', 'smart contract', 'solidity', 'web3', 'ethereum', 'solana', 'defi', 'nft'],

  // Content
  'writing': ['writing', 'documentation', 'docs', 'markdown', 'blog', 'content', 'readme', 'technical writing'],
  'pdf': ['pdf', 'document', 'docx', 'pptx', 'slides', 'presentation'],

  // Tools
  'git': ['git ', 'github', 'gitlab', 'version control', 'branch', 'merge', 'pull request', 'commit'],
  'editor': ['vscode', 'vim', 'neovim', 'emacs', 'ide', 'editor', 'cursor'],
  'monitoring': ['monitoring', 'observability', 'logging', 'tracing', 'sentry', 'datadog', 'prometheus', 'grafana'],
};

function generateTags(name: string, description: string, readme: string): string[] {
  // Scan name + description + first 1500 chars of readme
  const text = (name + ' ' + (description || '') + ' ' + (readme || '').slice(0, 1500)).toLowerCase();
  const tags: string[] = [];

  for (const [tag, keywords] of Object.entries(TAG_RULES)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        tags.push(tag);
        break; // only add tag once
      }
    }
  }

  // Deduplicate and cap at 15
  return [...new Set(tags)].slice(0, 15);
}

async function main() {
  const db = createDb();

  // Get all published skills with their readme
  const allSkills = await db.select({
    id: skills.id,
    name: skills.name,
    description: skills.description,
    readme: skills.readme,
    currentTags: skills.tags,
  }).from(skills).where(eq(skills.isPublished, true));

  console.log(`Processing ${allSkills.length} skills...\n`);

  let updated = 0;
  let tagsBefore = 0;
  let tagsAfter = 0;

  for (const skill of allSkills) {
    const oldTags = skill.currentTags || [];
    const newTags = generateTags(skill.name, skill.description || '', skill.readme || '');

    // Merge old + new tags (keep existing, add new ones)
    const merged = [...new Set([...oldTags, ...newTags])].slice(0, 15);

    tagsBefore += oldTags.length;
    tagsAfter += merged.length;

    if (merged.length > oldTags.length) {
      await db.update(skills).set({ tags: merged }).where(eq(skills.id, skill.id));
      updated++;
      if (updated <= 10) {
        console.log(`  ${skill.name}: ${oldTags.length} → ${merged.length} tags (+${merged.length - oldTags.length})`);
        console.log(`    added: ${merged.filter(t => !oldTags.includes(t)).join(', ')}`);
      }
    }
  }

  console.log(`\n=== Results ===`);
  console.log(`Skills processed: ${allSkills.length}`);
  console.log(`Skills updated: ${updated}`);
  console.log(`Tags before: ${tagsBefore} (avg ${(tagsBefore / allSkills.length).toFixed(1)}/skill)`);
  console.log(`Tags after: ${tagsAfter} (avg ${(tagsAfter / allSkills.length).toFixed(1)}/skill)`);

  process.exit(0);
}

main().catch(console.error);
