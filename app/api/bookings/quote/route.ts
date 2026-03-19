import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { calculateRentalQuote, overlaps } from "@/lib/rental";

const quoteSchema = z.object({
  itemId: z.string().min(2),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export async function POST(request: Request) {
  try {
    const input = quoteSchema.parse(await request.json());
    const item = await prisma.item.findUnique({
      where: { id: input.itemId },
      include: {
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

    const requested = { startDate: input.startDate, endDate: input.endDate };
    const blocked = [
      ...item.availabilityBlocks.map((x) => ({ startDate: x.startDate, endDate: x.endDate })),
      ...item.bookings.map((x) => ({ startDate: x.startDate, endDate: x.endDate })),
    ];

    if (blocked.some((b) => overlaps(requested, b))) {
      return NextResponse.json(
        { error: "Dates overlap with unavailable period" },
        { status: 409 },
      );
    }

    const quote = calculateRentalQuote({
      rentalPricePerDay: item.rentalPricePerDay,
      securityDeposit: item.securityDeposit,
      startDate: input.startDate,
      endDate: input.endDate,
    });

    return NextResponse.json({ quote });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid quote request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
