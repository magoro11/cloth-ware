import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, constructWebhookEvent } from "@/backend/lib/payments";

const prismaAny = prisma as any;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    const stripe = getStripe();
    if (!stripe) {
      console.warn("Stripe not configured, skipping webhook");
      return NextResponse.json({ message: "Stripe not configured" }, { status: 200 });
    }

    let event;
    try {
      event = await constructWebhookEvent(body, signature);
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err);
      return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
    }

    console.log("Stripe webhook received:", event.type);

    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object);
        break;
      case "payment_intent.canceled":
        await handlePaymentIntentCanceled(event.data.object);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object);
        break;
      default:
        console.log("Unhandled Stripe event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  const orderId = paymentIntent.metadata?.orderId;
  const paymentIntentId = paymentIntent.id;

  if (!orderId) {
    console.warn("No orderId in payment intent metadata:", paymentIntentId);
    return;
  }

  const payment = await prisma.payment.findFirst({
    where: { providerPaymentId: paymentIntentId },
    include: { order: { include: { subOrders: { include: { items: true } } } } },
  });

  if (!payment) {
    console.warn("Payment not found for Stripe payment intent:", paymentIntentId);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCEEDED",
        paidAt: new Date(),
        amount: paymentIntent.amount,
        rawResponse: {
          ...(payment.rawResponse as object || {}),
          paymentIntent: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
          },
        },
      },
    });

    await tx.order.update({
      where: { id: payment.orderId },
      data: { status: "PAID" },
    });

    for (const so of payment.order.subOrders) {
      for (const item of so.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }
    }

    await prismaAny.transaction.create({
      data: {
        userId: payment.order.userId,
        type: "RENTAL_PAYMENT",
        amount: payment.order.total,
        metadata: {
          orderId: payment.orderId,
          paymentId: payment.id,
          provider: "STRIPE",
          paymentIntentId: paymentIntent.id,
        },
      },
    });
  });

  console.log("Stripe payment succeeded for order:", payment.orderId);
}

async function handlePaymentIntentFailed(paymentIntent: any) {
  const paymentIntentId = paymentIntent.id;

  const payment = await prisma.payment.findFirst({
    where: { providerPaymentId: paymentIntentId },
    include: { order: true },
  });

  if (payment) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        rawResponse: {
          ...(payment.rawResponse as object || {}),
          paymentIntent: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            last_payment_error: paymentIntent.last_payment_error,
          },
        },
      },
    });

    await prisma.order.update({
      where: { id: payment.orderId },
      data: { status: "CANCELED" },
    });

    console.log("Stripe payment failed for order:", payment.orderId);
  }
}

async function handlePaymentIntentCanceled(paymentIntent: any) {
  const paymentIntentId = paymentIntent.id;

  const payment = await prisma.payment.findFirst({
    where: { providerPaymentId: paymentIntentId },
    include: { order: true },
  });

  if (payment) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "CANCELED" },
    });

    await prisma.order.update({
      where: { id: payment.orderId },
      data: { status: "CANCELED" },
    });

    console.log("Stripe payment canceled for order:", payment.orderId);
  }
}

async function handleChargeRefunded(charge: any) {
  const paymentIntentId = charge.payment_intent;
  
  const payment = await prisma.payment.findFirst({
    where: { 
      rawResponse: {
        path: ["paymentIntent", "id"],
        equals: paymentIntentId,
      },
    },
    include: { order: true },
  });

  if (payment) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "REFUNDED" },
    });

    await prisma.order.update({
      where: { id: payment.orderId },
      data: { status: "REFUNDED" },
    });

    console.log("Stripe charge refunded for order:", payment.orderId);
  }
}