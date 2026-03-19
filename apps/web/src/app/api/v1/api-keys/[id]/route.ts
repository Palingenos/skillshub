import { getDb } from "@/lib/db";
import { writeCorsJson, methodNotAllowed, writeOPTIONS } from "@/lib/api-cors";
import { authenticateApiKey, isAuthError } from "@/lib/api-key-auth";
import { apiKeys } from "@skillshub/db/schema";
import { eq, and } from "drizzle-orm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (isAuthError(auth)) return auth;

  const { id: keyId } = await params;
  if (!UUID_RE.test(keyId)) {
    return writeCorsJson(
      { error: { code: "NOT_FOUND", message: "API key not found" } },
      request,
      { status: 404 }
    );
  }

  const db = getDb();

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, auth.userId)))
    .limit(1);

  if (!key) {
    return writeCorsJson(
      { error: { code: "NOT_FOUND", message: "API key not found" } },
      request,
      { status: 404 }
    );
  }

  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(eq(apiKeys.id, keyId));

  return writeCorsJson({ data: { id: keyId, revoked: true } }, request);
}

export async function GET() { return methodNotAllowed(["DELETE"]); }
export async function POST() { return methodNotAllowed(["DELETE"]); }
export async function PUT() { return methodNotAllowed(["DELETE"]); }
export async function PATCH() { return methodNotAllowed(["DELETE"]); }

export function OPTIONS(request: Request) { return writeOPTIONS(request); }
