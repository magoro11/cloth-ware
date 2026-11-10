import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPayPalConfig, handlePayPalWebhook, verifyWebhookSignature } from "@/backend/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const config = getPayPalConfig();
    if (!config) {
      console.warn("PayPal not configured, skipping webhook verification");
      return NextResponse.json({ message: "PayPal not configured" }, { status: 200 });
    }

    const { verified, event } = await handlePayPalWebhook(config, headers, body);

    if (!verified || !event) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    console.log("PayPal webhook received:", event.event_type);

    switch (event.event_type) {
      case "CHECKOUT.ORDER.APPROVED":
        await handleOrderApproved(event);
        break;
      case "CHECKOUT.ORDER.COMPLETED":
        await handleOrderCompleted(event);
        break;
      case "PAYMENT.CAPTURE.COMPLETED":
        await handleCaptureCompleted(event);
        break;
      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.REFUNDED":
      case "PAYMENT.CAPTURE.REVERSED":
        await handleCaptureFailed(event);
        break;
      case "CHECKOUT.ORDER.CANCELLED":
      case "CHECKOUT.ORDER.EXPIRED":
        await handleOrderCancelled(event);
        break;
      default:
        console.log("Unhandled PayPal event type:", event.event_type);
    }

    return NextResponse.json({ message: "Webhook processed" });
  } catch (error) {
    console.error("PayPal webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleOrderApproved(event: any) {
  const orderId = event.resource.id;
  console.log("PayPal order approved:", orderId);
}

async function handleOrderCompleted(event: any) {
  const orderId = event.resource.id;
  const capture = event.resource.purchase_units?.[0]?.payments?.captures?.[0];
  
  if (!capture) {
    console.warn("No capture found in completed order:", orderId);
    return;
  }

  const payment = await prisma.payment.findFirst({
    where: { providerPaymentId: orderId },
    include: { order: { include: { items: true } } },
  });

  if (!payment) {
    console.warn("Payment not found for PayPal order:", orderId);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCEEDED",
        paidAt: new Date(),
        amount: Math.round(parseFloat(capture.amount.value) * 100),
        rawResponse: {
          ...(payment.rawResponse as object || {}),
          capture,
          event: event.event_type,
        },
      },
    });

    await tx.order.update({
      where: { id: payment.orderId },
      data: { status: "PAID" },
    });

    for (const item of payment.order.items) {
      await tx.productVariant.update({
        where: { id: item.variantId || item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    await tx.transaction.create({
      data: {
        userId: payment.order.userId,
        type: "RENTAL_PAYMENT",
        amount: payment.order.total,
        metadata: {
          orderId: payment.orderId,
          paymentId: payment.id,
          provider: "PAYPAL",
          captureId: capture.id,
        },
      },
    });
  });

  console.log("PayPal payment completed for order:", payment.orderId);
}

async function handleCaptureCompleted(event: any) {
  const captureId = event.resource.id;
  const orderId = event.resource.supplementary_data?.related_ids?.order_id;
  
  console.log("PayPal capture completed:", captureId, "for order:", orderId);
}

async function handleCaptureFailed(event: any) {
  const captureId = event.resource.id;
  const status = event.event_type === "PAYMENT.CAPTURE.DENIED" ? "FAILED" : "REFUNDED";
  
  const payment = await prisma.payment.findFirst({
    where: { 
      rawResponse: {
        path: ["capture", "id"],
        equals: captureId,
      },
    },
    include: { order: true },
  });

  if (payment) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status },
    });

    if (status === "FAILED") {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { status: "CANCELED" },
      });
    }

    console.log("PayPal capture", status.toLowerCase(), "for payment:", payment.id);
  }
}

async function handleOrderCancelled(event: any) {
  const orderId = event.resource.id;
  
  const payment = await prisma.payment.findFirst({
    where: { providerPaymentId: orderId },
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

    console.log("PayPal order cancelled:", orderId);
  }
}