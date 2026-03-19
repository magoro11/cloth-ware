import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { errorStatus } from "@/lib/errors";

const schema = z.object({
  itemId: z.string(),
  bookingId: z.string().optional(),
  adminNote: z.string().min(5).max(500),
  repairCost: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN"]);
    const body = schema.parse(await request.json());

    const bookingId = body.bookingId?.trim() ? body.bookingId : undefined;
    const booking = bookingId
      ? await prisma.booking.findUnique({ where: { id: body.bookingId } })
      : null;

    const deducted = booking ? Math.min(booking.securityDeposit, body.repairCost) : 0;

    const result = await prisma.$transaction(async (tx) => {
      const repair = await tx.repairLog.create({
        data: {
          itemId: body.itemId,
          bookingId,
          adminNote: body.adminNote,
          repairCost: body.repairCost,
          deductedFromDeposit: deducted,
        },
      });

      if (booking) {
        await tx.booking.update({
          where: { id: booking.id },
          data: { damageReported: true },
        });
        await tx.transaction.create({
          data: {
            bookingId: booking.id,
            type: "REPAIR_DEDUCTION",
            amount: deducted,
            metadata: { note: body.adminNote, repairCost: body.repairCost },
          },
        });
      }

      return repair;
    });

    return NextResponse.json({ repairLog: result }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Repair logging failed";
    const status =
      msg === "Unauthorized"
        ? 401
        : msg === "Forbidden"
          ? 403
          : errorStatus(error, 400);
    return NextResponse.json({ error: msg }, { status });
  }
}
