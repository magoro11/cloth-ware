import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access";
import { errorStatus } from "@/lib/errors";
import { initiateMpesaStk, MpesaStkError } from "@/lib/mpesa";

const schema = z.object({
  bookingId: z.string(),
  phone: z.string(), // e.g. 2547XXXXXXXX
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { bookingId, phone } = schema.parse(await request.json());

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { item: true },
    });

    if (!booking || booking.customerId !== user.id) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Existing amounts are stored in the smallest currency unit (like Stripe).
    // For M-Pesa we need an integer in base currency, so we convert by 100.
    const totalCents = booking.rentalAmount + booking.securityDeposit;
    const amount = Math.max(1, Math.round(totalCents / 100));

    const mpesaResponse = await initiateMpesaStk({
      phone,
      amount,
      accountReference: booking.id,
      description: `${booking.item.brand} ${booking.item.title} rental`,
    });

    return NextResponse.json({ mpesa: mpesaResponse });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "M-Pesa checkout failed";
    const status = msg === "Unauthorized" ? 401 : errorStatus(error, 400);
    const details = error instanceof MpesaStkError ? error.details : undefined;
    return NextResponse.json({ error: msg, details }, { status });
  }
}

