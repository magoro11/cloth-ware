import { NextResponse } from "next/server";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    await requireRole(["ADMIN"]);
    const { id } = await params;

    await prisma.item.update({
      where: { id },
      data: { featured: true },
    });

    return NextResponse.redirect(new URL("/dashboard/admin", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to approve listing";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
