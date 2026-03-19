import { corsJson, methodNotAllowed, OPTIONS as corsOptions } from "@/lib/api-cors";

export async function GET() {
  return corsJson({ status: "ok", timestamp: new Date().toISOString() });
}

export async function POST() { return methodNotAllowed(["GET"]); }
export async function PUT() { return methodNotAllowed(["GET"]); }
export async function DELETE() { return methodNotAllowed(["GET"]); }
export async function PATCH() { return methodNotAllowed(["GET"]); }

export { corsOptions as OPTIONS };
