import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/backend/lib/stripe";
import { requireUser } from "@/lib/access";
import { errorStatus } from "@/backend/lib/errors";

const schema = z.object({
  subOrderId: z.string(),
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
    const { subOrderId } = schema.parse(await request.json());
    const subOrder = await prisma.subOrder.findUnique({
      where: { id: subOrderId },
      include: {
        order: { select: { userId: true } },
        items: { include: { product: { include: { brand: true } } } },
      },
    });
    if (!subOrder || subOrder.order.userId !== user.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const item = subOrder.items[0]?.product;
    const title = item?.title ?? "your order";
    const brandName = item?.brand?.name;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/dashboard?paid=1`,
      cancel_url: `${origin}/account/orders/${subOrder.orderId}?canceled=1`,
      metadata: {
        subOrderId: subOrder.id,
        orderId: subOrder.orderId,
        customerId: user.id,
        vendorId: subOrder.vendorId,
        orderAmount: String(subOrder.total),
        commissionAmount: String(subOrder.commissionAmount),
      },
      line_items: [
        {
          quantity: subOrder.items[0]?.quantity || 1,
          price_data: {
            currency: "kes",
            unit_amount: subOrder.total,
            product_data: {
              name: `${brandName ? brandName + " " : ""}${title}`,
              description: "Cloth marketplace order",
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
