import { NextResponse } from "next/server";
import { z } from "zod";

const eventSchema = z.object({
  path: z.string().min(1),
  query: z.string().optional(),
  viewedAt: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = eventSchema.parse(await request.json());
    console.info("[analytics]", payload.path, payload.query || "", payload.viewedAt || "");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
