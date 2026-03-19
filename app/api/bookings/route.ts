import { NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { calculateRentalQuote, overlaps } from "@/lib/rental";
import { requireUser } from "@/lib/access";
import { sendEmailNotification } from "@/lib/notifications";

const createBookingSchema = z.object({
  itemId: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = createBookingSchema.parse(await request.json());
    const item = await prisma.item.findUnique({
      where: { id: body.itemId },
      include: {
        owner: { select: { email: true, name: true } },
        availabilityBlocks: true,
        bookings: {
          where: { status: { in: ["PENDING", "CONFIRMED", "ACTIVE", "LATE"] } },
          select: { startDate: true, endDate: true },
        },
      },
    });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    if (!item.featured) {
      return NextResponse.json({ error: "Listing is pending admin approval" }, { status: 409 });
    }

    if (item.ownerId === user.id) {
      return NextResponse.json({ error: "Cannot book your own item" }, { status: 400 });
    }

    const requested = { startDate: body.startDate, endDate: body.endDate };
    const blocks = [
      ...item.availabilityBlocks.map((x) => ({ startDate: x.startDate, endDate: x.endDate })),
      ...item.bookings.map((x) => ({ startDate: x.startDate, endDate: x.endDate })),
    ];
    if (blocks.some((range) => overlaps(range, requested))) {
      return NextResponse.json({ error: "Item unavailable for selected dates" }, { status: 409 });
    }

    const quote = calculateRentalQuote({
      rentalPricePerDay: item.rentalPricePerDay,
      securityDeposit: item.securityDeposit,
      startDate: body.startDate,
      endDate: body.endDate,
    });

    const booking = await prisma.booking.create({
      data: {
        itemId: item.id,
        customerId: user.id,
        startDate: body.startDate,
        endDate: body.endDate,
        days: quote.days,
        rentalAmount: quote.rentalAmount,
        securityDeposit: quote.securityDeposit,
        commissionAmount: quote.commissionAmount,
        ownerPayoutAmount: quote.ownerPayoutAmount,
        status: BookingStatus.PENDING,
      },
      include: { item: { include: { owner: true } } },
    });

    if (booking.item.owner.email) {
      await sendEmailNotification({
        to: booking.item.owner.email,
        subject: "New rental request",
        html: `<p>You have a new booking request for ${booking.item.title}.</p>`,
      });
    }

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unable to create booking";
    const status = msg === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
