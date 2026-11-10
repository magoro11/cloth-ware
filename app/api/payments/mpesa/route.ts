import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleMpesaCallback } from "@/backend/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const callback = await request.json();
    const result = await handleMpesaCallback(callback);

    if (!result.success) {
      return NextResponse.json({ error: "Failed to process callback" }, { status: 400 });
    }

    const checkoutRequestId = result.paymentId;
    const status = result.status;

    if (!checkoutRequestId) {
      return NextResponse.json({ error: "Missing checkout request ID" }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        payments: {
          some: {
            providerPaymentId: checkoutRequestId,
          },
        },
      },
      include: {
        payments: true,
        items: true,
      },
    });

    if (!order) {
      console.warn("Order not found for M-Pesa callback:", checkoutRequestId);
      return NextResponse.json({ message: "Order not found" }, { status: 200 });
    }

    const payment = order.payments.find((p) => p.providerPaymentId === checkoutRequestId);
    if (!payment) {
      console.warn("Payment not found for M-Pesa callback:", checkoutRequestId);
      return NextResponse.json({ message: "Payment not found" }, { status: 200 });
    }

    if (status === "completed") {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCEEDED",
            paidAt: new Date(),
            rawResponse: {
              ...(payment.rawResponse as object || {}),
              callback: callback,
            },
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: { status: "PAID" },
        });

        for (const item of order.items) {
          await tx.productVariant.update({
            where: { id: item.variantId || item.productId },
            data: {
              stock: { decrement: item.quantity },
            },
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
              provider: "MPESA",
              checkoutRequestId,
            },
          },
        });
      });

      console.log("M-Pesa payment completed for order:", order.id);
    } else if (status === "failed") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          rawResponse: {
            ...(payment.rawResponse as object || {}),
            callback: callback,
          },
        },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELED" },
      });

      console.log("M-Pesa payment failed for order:", order.id);
    }

    return NextResponse.json({ message: "Callback processed" });
  } catch (error) {
    console.error("M-Pesa callback error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}