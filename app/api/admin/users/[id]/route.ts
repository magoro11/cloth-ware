import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { errorStatus } from "@/lib/errors";
import { isPrismaUnknownFieldError } from "@/lib/prisma-compat";

const prismaAny = prisma as any;

const patchSchema = z.object({
  isBanned: z.boolean().optional(),
  role: z.enum(["CUSTOMER", "LENDER", "ADMIN"]).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const admin = await requireRole(["ADMIN"]);
    const { id } = await params;
    const payload = patchSchema.parse(await request.json());

    if (id === admin.id && payload.isBanned) {
      return NextResponse.json({ error: "You cannot ban your own account." }, { status: 400 });
    }

    let user;
    try {
      user = await prismaAny.user.update({
        where: { id },
        data: {
          isBanned: payload.isBanned,
          role: payload.role,
        },
      });
    } catch (error) {
      if (!isPrismaUnknownFieldError(error)) throw error;
      user = await prismaAny.user.update({
        where: { id },
        data: {
          role: payload.role,
        },
      });
    }

    return NextResponse.json({ user });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unable to update user";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : errorStatus(error, 400) });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const admin = await requireRole(["ADMIN"]);
    const { id } = await params;

    if (id === admin.id) {
      return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
    }

    await prismaAny.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unable to delete user";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : errorStatus(error, 400) });
  }
}
