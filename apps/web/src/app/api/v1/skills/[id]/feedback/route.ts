import { getDb } from "@/lib/db";
import { corsJson, writeCorsJson, methodNotAllowed, writeOPTIONS, formatZodError } from "@/lib/api-cors";
import { authenticateApiKey, isAuthError } from "@/lib/api-key-auth";
import { skills, skillFeedback } from "@skillshub/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { z } from "zod";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const feedbackSchema = z.object({
  task: z.string().min(1).max(500),
  helpful: z.boolean(),
  context: z.enum(["resolve", "search", "direct"]).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return writeCorsJson(
      { error: { code: "VALIDATION_ERROR", message: "Invalid skill ID format" } },
      request,
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return writeCorsJson(
      { error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
      request,
      { status: 400 }
    );
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return writeCorsJson(
      { error: { code: "VALIDATION_ERROR", message: formatZodError(parsed.error) } },
      request,
      { status: 400 }
    );
  }

  const db = getDb();

  // Check skill exists
  const [skill] = await db
    .select({ id: skills.id })
    .from(skills)
    .where(eq(skills.id, id))
    .limit(1);

  if (!skill) {
    return writeCorsJson(
      { error: { code: "NOT_FOUND", message: "Skill not found" } },
      request,
      { status: 404 }
    );
  }

  const { task, helpful, context } = parsed.data;

  // Upsert: insert or update if same agent already left feedback today
  await db.execute(sql`
    INSERT INTO skill_feedback (id, skill_id, agent_id, task, helpful, context)
    VALUES (gen_random_uuid(), ${id}, ${auth.userId}, ${task}, ${helpful}, ${context ?? null})
    ON CONFLICT (skill_id, agent_id, CAST(created_at AT TIME ZONE 'UTC' AS date))
    DO UPDATE SET task = EXCLUDED.task, helpful = EXCLUDED.helpful, context = EXCLUDED.context, created_at = NOW()
  `);

  // Recompute feedback stats for this skill
  const [stats] = await db
    .select({
      totalFeedback: sql<number>`count(*)::int`,
      helpfulCount: sql<number>`count(*) filter (where ${skillFeedback.helpful} = true)::int`,
    })
    .from(skillFeedback)
    .where(eq(skillFeedback.skillId, id));

  const totalFeedback = stats?.totalFeedback ?? 0;
  const helpfulRate =
    totalFeedback > 0
      ? Math.round((stats.helpfulCount / totalFeedback) * 100) / 100
      : null;

  // Update skill stats
  await db
    .update(skills)
    .set({
      feedbackCount: totalFeedback,
      helpfulRate: helpfulRate !== null ? String(helpfulRate) : null,
    })
    .where(eq(skills.id, id));

  return writeCorsJson({
    recorded: true,
    stats: { helpfulRate, totalFeedback },
  }, request);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return corsJson(
      { error: { code: "NOT_FOUND", message: "Skill not found" } },
      { status: 404 }
    );
  }

  const db = getDb();

  const [skill] = await db
    .select({
      helpfulRate: skills.helpfulRate,
      feedbackCount: skills.feedbackCount,
    })
    .from(skills)
    .where(eq(skills.id, id))
    .limit(1);

  if (!skill) {
    return corsJson(
      { error: { code: "NOT_FOUND", message: "Skill not found" } },
      { status: 404 }
    );
  }

  const recentFeedback = await db
    .select({
      task: skillFeedback.task,
      helpful: skillFeedback.helpful,
      context: skillFeedback.context,
      createdAt: skillFeedback.createdAt,
    })
    .from(skillFeedback)
    .where(eq(skillFeedback.skillId, id))
    .orderBy(desc(skillFeedback.createdAt))
    .limit(5);

  return corsJson({
    helpfulRate: skill.helpfulRate !== null ? Number(skill.helpfulRate) : null,
    totalFeedback: skill.feedbackCount,
    recentFeedback,
  });
}

export async function PUT() { return methodNotAllowed(["GET", "POST"]); }
export async function DELETE() { return methodNotAllowed(["GET", "POST"]); }
export async function PATCH() { return methodNotAllowed(["GET", "POST"]); }

export function OPTIONS(request: Request) { return writeOPTIONS(request); }
