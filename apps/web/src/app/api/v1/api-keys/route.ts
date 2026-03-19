import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { corsJson, writeCorsJson, methodNotAllowed, writeOPTIONS, formatZodError } from "@/lib/api-cors";
import { authenticateApiKey, isAuthError } from "@/lib/api-key-auth";
import { apiKeys } from "@skillshub/db/schema";
import { createApiKeySchema } from "@skillshub/shared/validators";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (isAuthError(auth)) return auth;

  const db = getDb();

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, auth.userId));

  return corsJson({ data: keys });
}

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (isAuthError(auth)) return auth;

  const body = await request.json();
  const parsed = createApiKeySchema.safeParse(body);

  if (!parsed.success) {
    return writeCorsJson(
      { error: { code: "VALIDATION_ERROR", message: formatZodError(parsed.error) } },
      request,
      { status: 400 }
    );
  }

  const rawKey = "skh_" + crypto.randomBytes(32).toString("base64url");
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 12) + "...";

  const db = getDb();
  const [created] = await db
    .insert(apiKeys)
    .values({
      userId: auth.userId,
      name: parsed.data.name,
      keyHash,
      keyPrefix,
    })
    .returning();

  return writeCorsJson(
    {
      data: {
        id: created.id,
        name: created.name,
        key: rawKey, // Only shown once
        keyPrefix,
        createdAt: created.createdAt,
      },
    },
    request,
    { status: 201 }
  );
}

export async function PUT() { return methodNotAllowed(["GET", "POST"]); }
export async function DELETE() { return methodNotAllowed(["GET", "POST"]); }
export async function PATCH() { return methodNotAllowed(["GET", "POST"]); }

export function OPTIONS(request: Request) { return writeOPTIONS(request); }
