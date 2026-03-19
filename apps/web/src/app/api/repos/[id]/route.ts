import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { repos, skills } from "@skillshub/db/schema";
import { eq } from "drizzle-orm";

// PATCH /api/repos/:id — rename repo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login required" } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const body = await request.json();
  const db = getDb();

  // Verify ownership
  const [repo] = await db
    .select({ ownerId: repos.ownerId })
    .from(repos)
    .where(eq(repos.id, id))
    .limit(1);

  if (!repo) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Repo not found" } },
      { status: 404 }
    );
  }

  if (repo.ownerId !== user.userId) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Not the owner" } },
      { status: 403 }
    );
  }

  const displayName = body.displayName?.trim();
  if (!displayName || displayName.length > 200) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid name" } },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(repos)
    .set({ displayName, updatedAt: new Date() })
    .where(eq(repos.id, id))
    .returning();

  return NextResponse.json({ data: updated });
}

// DELETE /api/repos/:id — delete repo and all its skills
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login required" } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const db = getDb();

  // Verify ownership
  const [repo] = await db
    .select({ ownerId: repos.ownerId })
    .from(repos)
    .where(eq(repos.id, id))
    .limit(1);

  if (!repo) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Repo not found" } },
      { status: 404 }
    );
  }

  if (repo.ownerId !== user.userId) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Not the owner" } },
      { status: 403 }
    );
  }

  // Delete all skills in the repo first, then the repo
  await db.delete(skills).where(eq(skills.repoId, id));
  await db.delete(repos).where(eq(repos.id, id));

  return NextResponse.json({ data: { id, deleted: true } });
}
