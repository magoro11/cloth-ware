import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireUser } from "@/lib/access";
import { errorStatus } from "@/lib/errors";

const schema = z.object({
  bookingId: z.string(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured. Add STRIPE_SECRET_KEY." },
        { status: 500 },
      );
    }
    const { bookingId } = schema.parse(await request.json());
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { item: true },
    });
    if (!booking || booking.customerId !== user.id) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/dashboard?paid=1`,
      cancel_url: `${origin}/item/${booking.itemId}?canceled=1`,
      metadata: {
        bookingId: booking.id,
        customerId: user.id,
        ownerId: booking.item.ownerId,
        rentalAmount: String(booking.rentalAmount),
        securityDeposit: String(booking.securityDeposit),
        commissionAmount: String(booking.commissionAmount),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: booking.rentalAmount,
            product_data: {
              name: `${booking.item.brand} ${booking.item.title} rental`,
              description: `${booking.days} day rental`,
            },
          },
        },
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: booking.securityDeposit,
            product_data: {
              name: "Security deposit",
            },
          },
        },
      ],
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Checkout failed";
    const status = msg === "Unauthorized" ? 401 : errorStatus(error, 400);
    return NextResponse.json({ error: msg }, { status });
  }
}
