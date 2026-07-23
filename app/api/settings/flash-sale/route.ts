import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const deadline = new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString();
  return NextResponse.json({ deadline });
}
