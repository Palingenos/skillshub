import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { writeCorsJson, methodNotAllowed, writeOPTIONS, formatZodError } from "@/lib/api-cors";
import { users, apiKeys } from "@skillshub/db/schema";
import { agentRegisterSchema } from "@skillshub/shared/validators";
import { eq } from "drizzle-orm";

function generateApiKey(): string {
  return "skh_" + crypto.randomBytes(32).toString("base64url");
}

function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = agentRegisterSchema.safeParse(body);

  if (!parsed.success) {
    return writeCorsJson(
      { error: { code: "VALIDATION_ERROR", message: formatZodError(parsed.error) } },
      request,
      { status: 400 }
    );
  }

  const db = getDb();

  // Check username uniqueness
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, parsed.data.username))
    .limit(1);

  if (existing) {
    return writeCorsJson(
      { error: { code: "CONFLICT", message: "Username already taken" } },
      request,
      { status: 409 }
    );
  }

  // Create agent user
  const [agent] = await db
    .insert(users)
    .values({
      username: parsed.data.username,
      displayName: parsed.data.displayName,
      bio: parsed.data.bio,
      role: "agent",
    })
    .returning();

  // Generate API key
  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);

  await db.insert(apiKeys).values({
    userId: agent.id,
    name: "default",
    keyHash,
    keyPrefix: rawKey.slice(0, 12) + "...",
  });

  return writeCorsJson(
    {
      data: {
        id: agent.id,
        username: agent.username,
        apiKey: rawKey, // Only shown once
      },
    },
    request,
    { status: 201 }
  );
}

export async function GET() { return methodNotAllowed(["POST"]); }
export async function PUT() { return methodNotAllowed(["POST"]); }
export async function DELETE() { return methodNotAllowed(["POST"]); }
export async function PATCH() { return methodNotAllowed(["POST"]); }

export function OPTIONS(request: Request) { return writeOPTIONS(request); }
