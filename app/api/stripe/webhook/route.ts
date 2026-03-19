import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { errorStatus } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = (await headers()).get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });
    }
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;
      const customerId = session.metadata?.customerId;
      const rentalAmount = Number(session.metadata?.rentalAmount || 0);
      const securityDeposit = Number(session.metadata?.securityDeposit || 0);
      const commissionAmount = Number(session.metadata?.commissionAmount || 0);
      if (bookingId) {
        await prisma.$transaction([
          prisma.booking.update({
            where: { id: bookingId },
            data: { status: "CONFIRMED" },
          }),
          prisma.transaction.create({
            data: {
              bookingId,
              userId: customerId,
              type: "RENTAL_PAYMENT",
              amount: rentalAmount,
              stripePaymentIntent: String(session.payment_intent),
              metadata: session.metadata || {},
            },
          }),
          prisma.transaction.create({
            data: {
              bookingId,
              userId: customerId,
              type: "DEPOSIT_HOLD",
              amount: securityDeposit,
              stripePaymentIntent: String(session.payment_intent),
              metadata: session.metadata || {},
            },
          }),
          prisma.transaction.create({
            data: {
              bookingId,
              type: "COMMISSION",
              amount: commissionAmount,
              stripePaymentIntent: String(session.payment_intent),
              metadata: session.metadata || {},
            },
          }),
        ]);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: errorStatus(error, 400) },
    );
  }
}
