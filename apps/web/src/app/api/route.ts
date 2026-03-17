import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.redirect(
    new URL(
      "/api/v1",
      process.env.NEXT_PUBLIC_APP_URL ?? "https://skillshub.wtf",
    ),
    308,
  );
}
