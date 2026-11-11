import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/backend/lib/stripe";
import { prisma } from "@/lib/prisma";
import { errorStatus } from "@/backend/lib/errors";

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
      const subOrderId = session.metadata?.subOrderId;
      const orderId = session.metadata?.orderId;
      const customerId = session.metadata?.customerId;
      const vendorId = session.metadata?.vendorId;
      const orderAmount = Number(session.metadata?.orderAmount || 0);
      const commissionAmount = Number(session.metadata?.commissionAmount || 0);

      if (subOrderId && orderId && customerId) {
        await prisma.$transaction([
          prisma.subOrder.update({
            where: { id: subOrderId },
            data: { status: "CONFIRMED" },
          }),
          prisma.payment.create({
            data: {
              orderId,
              subOrderId,
              userId: customerId,
              provider: "STRIPE",
              providerPaymentId: String(session.payment_intent),
              status: "SUCCEEDED",
              amount: orderAmount,
              currency: "KES",
              paidAt: new Date(),
              rawResponse: session.metadata || {},
            },
          }),
          prisma.payment.create({
            data: {
              orderId,
              subOrderId,
              userId: vendorId || customerId,
              provider: "STRIPE",
              providerPaymentId: String(session.payment_intent) + "-commission",
              status: "SUCCEEDED",
              amount: commissionAmount,
              currency: "KES",
              paidAt: new Date(),
              rawResponse: session.metadata || {},
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
