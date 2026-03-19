import { NextResponse } from "next/server";
import { differenceInCalendarDays } from "date-fns";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { sendEmailNotification } from "@/lib/notifications";

const schema = z.object({
  returnedAt: z.coerce.date().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    await requireRole(["ADMIN"]);
    const { id } = await params;
    const payload = schema.parse(await request.json());
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { item: true, customer: { select: { email: true } } },
    });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const returnDate = payload.returnedAt || new Date();
    const lateDays = Math.max(0, differenceInCalendarDays(returnDate, booking.endDate));
    const lateFee = lateDays * Math.round(booking.item.rentalPricePerDay * 0.3);
    const finalOwnerPayout = booking.ownerPayoutAmount + lateFee;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: lateDays > 0 ? "LATE" : "COMPLETED",
          returnDate,
          lateFeeAmount: lateFee,
        },
      });

      await tx.payout.upsert({
        where: { bookingId: booking.id },
        update: { amount: finalOwnerPayout, status: "RELEASED", releasedAt: new Date() },
        create: {
          bookingId: booking.id,
          ownerId: booking.item.ownerId,
          amount: finalOwnerPayout,
          status: "RELEASED",
          releasedAt: new Date(),
        },
      });

      await tx.transaction.create({
        data: {
          bookingId: booking.id,
          userId: booking.item.ownerId,
          type: "PAYOUT",
          amount: finalOwnerPayout,
          metadata: { lateDays, lateFee },
        },
      });

      await tx.transaction.create({
        data: {
          bookingId: booking.id,
          userId: booking.customerId,
          type: "RENTAL_PAYMENT",
          amount: 0,
          metadata: { event: "RETURN_CONFIRMED" },
        },
      });

      await tx.transaction.create({
        data: {
          bookingId: booking.id,
          userId: booking.customerId,
          type: "DEPOSIT_HOLD",
          amount: -Math.max(booking.securityDeposit - lateFee, 0),
          metadata: { event: "DEPOSIT_REFUND", lateFee },
        },
      });

      return updated;
    });

    if (booking.customer.email) {
      await sendEmailNotification({
        to: booking.customer.email,
        subject: "Return confirmed and deposit update",
        html: `<p>Your return has been processed. Late fee applied: ${lateFee} cents.</p>`,
      });
    }

    return NextResponse.json({ booking: result, lateDays, lateFee }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete booking";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
