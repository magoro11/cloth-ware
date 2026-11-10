import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { Stripe } from "stripe";
import { stripe } from "@/backend/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendEmailNotification } from "@/backend/lib/notifications";

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
      const orderId = session.metadata?.orderId;

      if (orderId) {
        // Idempotent: Payment.providerPaymentId is unique; skip if already processed.
        const existing = await prisma.payment.findFirst({
          where: { providerPaymentId: session.id, status: "SUCCEEDED" },
          select: { id: true },
        });

        if (!existing) {
          await prisma.$transaction([
            prisma.payment.updateMany({
              where: { orderId },
              data: { status: "SUCCEEDED", paidAt: new Date(), rawResponse: session as any },
            }),
            prisma.order.update({
              where: { id: orderId },
              data: { status: "PAID" },
            }),
            // Decrement stock for each purchased variant
            ...(await (async () => {
              const items = await prisma.orderItem.findMany({
                where: { orderId },
                include: { variant: true },
              });
              return items
                .filter((item) => Boolean(item.variantId))
                .map((item) =>
                  prisma.productVariant.update({
                    where: { id: item.variantId! },
                    data: { stock: { decrement: item.quantity } },
                  }),
                );
            })()),
            // Clear the buyer's cart after successful payment
            ...(session.metadata?.userId
              ? [prisma.storeCart.deleteMany({ where: { userId: session.metadata?.userId as string } })]
              : []),
          ]);

          const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { user: true },
          });
          if (order?.user?.email) {
            void sendEmailNotification({
              to: order.user.email,
              subject: "Your Cloth Marketplace order is confirmed",
              html: `<h2>Order ${order.id} received</h2><p>Total: ${(order.total / 100).toFixed(2)} KES</p><p>We'll notify you when it ships.</p>`,
            });
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 400 },
    );
  }
}
