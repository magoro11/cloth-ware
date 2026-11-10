import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2026-02-25.clover" });

  const headerList = await headers();
  const signature = headerList.get("stripe-signature") ?? "";

  let body: string;
  try {
    const reader = req.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: "No body" }, { status: 400 });
    }
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) chunks.push(value);
    }
    body = Buffer.concat(chunks).toString();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: check if we already processed this event
  const existingEvent = await prisma.notification.findFirst({
    where: { title: `stripe:${event.id}` },
    select: { id: true },
  });
  if (existingEvent) {
    return NextResponse.json({ received: true });
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  if (event.type === "payment_intent.succeeded" || event.type === "payment_intent.payment_failed") {
    const providerPaymentId = paymentIntent.id;
    const succeeded = event.type === "payment_intent.succeeded";

    try {
      await prisma.$transaction(async (tx) => {
        // Idempotency: skip if payment already SUCCEEDED
        const existingPayment = await tx.payment.findUnique({
          where: { providerPaymentId },
          select: { id: true, status: true, orderId: true },
        });

        if (existingPayment && existingPayment.status === "SUCCEEDED") {
          return;
        }

        await tx.payment.upsert({
          where: { providerPaymentId },
          update: {
            status: succeeded ? "SUCCEEDED" : "FAILED",
            paidAt: succeeded ? new Date() : null,
            rawResponse: paymentIntent as any,
          },
          create: {
            orderId: existingPayment?.orderId ?? "",
            provider: "STRIPE",
            providerPaymentId,
            status: succeeded ? "SUCCEEDED" : "FAILED",
            amount: paymentIntent.amount,
            currency: paymentIntent.currency.toUpperCase(),
            paidAt: succeeded ? new Date() : null,
            rawResponse: paymentIntent as any,
            userId: paymentIntent.metadata?.userId ?? "",
          },
        });

        if (succeeded && existingPayment?.orderId) {
          await tx.order.update({
            where: { id: existingPayment.orderId },
            data: { status: "PAID" },
          });
          await tx.subOrder.updateMany({
            where: { orderId: existingPayment.orderId },
            data: { status: "CONFIRMED" },
          });
        }
      });

      // Mark event as processed
      await prisma.notification.create({
        data: {
          userId: paymentIntent.metadata?.userId ?? "",
          title: `stripe:${event.id}`,
          body: `Payment ${succeeded ? "succeeded" : "failed"} for ${paymentIntent.id}`,
          type: "PAYMENT",
          isRead: false,
        },
      });
    } catch (error) {
      console.error("Stripe webhook error:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
