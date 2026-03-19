import { getDb } from "@/lib/db";
import { corsJson, methodNotAllowed, OPTIONS as corsOptions } from "@/lib/api-cors";
import { skills, repos, users } from "@skillshub/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const trendingQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams);
  const parsed = trendingQuerySchema.safeParse(query);
  const limit = parsed.success ? parsed.data.limit : 20;

  const db = getDb();

  const data = await db
    .select({
      id: skills.id,
      slug: skills.slug,
      name: skills.name,
      description: skills.description,
      tags: skills.tags,
      createdAt: skills.createdAt,
      repo: {
        id: repos.id,
        starCount: repos.starCount,
        downloadCount: repos.downloadCount,
        githubOwner: repos.githubOwner,
        githubRepoName: repos.githubRepoName,
      },
      owner: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(skills)
    .innerJoin(repos, eq(skills.repoId, repos.id))
    .innerJoin(users, eq(skills.ownerId, users.id))
    .where(eq(skills.isPublished, true))
    .orderBy(desc(repos.starCount), desc(skills.createdAt))
    .limit(limit);

  return corsJson({ data, total: data.length });
}

export async function POST() { return methodNotAllowed(["GET"]); }
export async function PUT() { return methodNotAllowed(["GET"]); }
export async function DELETE() { return methodNotAllowed(["GET"]); }
export async function PATCH() { return methodNotAllowed(["GET"]); }

export { corsOptions as OPTIONS };
