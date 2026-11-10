import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyPayment } from "@/backend/lib/payments";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  const paymentId = searchParams.get("paymentId");
  const paymentMethod = searchParams.get("paymentMethod");

  if (!orderId || !paymentId || !paymentMethod) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  const payment = await prisma.payment.findFirst({
    where: {
      orderId,
      providerPaymentId: paymentId,
    },
    include: { order: true },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (payment.status === "SUCCEEDED") {
    return NextResponse.json({ 
      status: "completed", 
      orderId: payment.orderId,
      amount: payment.amount,
    });
  }

  if (payment.status === "FAILED" || payment.status === "CANCELED") {
    return NextResponse.json({ 
      status: "failed", 
      orderId: payment.orderId,
    });
  }

  const result = await verifyPayment(paymentMethod as any, paymentId, orderId);

  if (result.success && result.status === "completed") {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCEEDED",
          paidAt: new Date(),
          amount: result.amount || payment.amount,
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: "PAID" },
      });

      const order = await tx.order.findUnique({
        where: { id: payment.orderId },
        include: { items: true },
      });

      if (order) {
        for (const item of order.items) {
          await tx.productVariant.update({
            where: { id: item.variantId || item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }

        await tx.transaction.create({
          data: {
            userId: order.userId,
            type: "RENTAL_PAYMENT",
            amount: order.total,
            metadata: {
              orderId: order.id,
              paymentId: payment.id,
              provider: paymentMethod.toUpperCase(),
              providerPaymentId: paymentId,
            },
          },
        });
      }
    });

    return NextResponse.json({ 
      status: "completed", 
      orderId: payment.orderId,
      amount: result.amount,
    });
  }

  if (result.success && result.status === "failed") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });

    await prisma.order.update({
      where: { id: payment.orderId },
      data: { status: "CANCELED" },
    });

    return NextResponse.json({ 
      status: "failed", 
      orderId: payment.orderId,
    });
  }

  return NextResponse.json({ 
    status: "pending", 
    orderId: payment.orderId,
  });
}