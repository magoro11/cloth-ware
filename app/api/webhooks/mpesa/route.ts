import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const headerList = await headers();
  const signature = headerList.get("x-signature") ?? "";

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid JSON" }, { status: 400 });
  }

  const stkCallback = body.Body?.stkCallback;
  if (!stkCallback) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Missing stkCallback" }, { status: 400 });
  }

  const checkoutRequestId = stkCallback.CheckoutRequestID;
  const resultCode = stkCallback.ResultCode;
  const resultDesc = stkCallback.ResultDesc;

  if (!checkoutRequestId) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Missing CheckoutRequestID" }, { status: 400 });
  }

  // Idempotency: check if payment already processed
  const existingPayment = await prisma.payment.findUnique({
    where: { providerPaymentId: checkoutRequestId },
    select: { id: true, status: true, orderId: true },
  });

  if (existingPayment && existingPayment.status === "SUCCEEDED") {
    // Already processed - acknowledge to stop retries
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Already processed" });
  }

  const succeeded = resultCode === 0;

  try {
    await prisma.$transaction(async (tx) => {
      // Upsert payment - create if not exists, update if exists
      await tx.payment.upsert({
        where: { providerPaymentId: checkoutRequestId },
        update: {
          status: succeeded ? "SUCCEEDED" : "FAILED",
          paidAt: succeeded ? new Date() : null,
          rawResponse: body,
        },
        create: {
          orderId: existingPayment?.orderId ?? "",
          provider: "MPESA_DARAJA",
          providerPaymentId: checkoutRequestId,
          status: succeeded ? "SUCCEEDED" : "FAILED",
          amount: 0,
          currency: "KES",
          paidAt: succeeded ? new Date() : null,
          rawResponse: body,
          userId: "",
        },
      });

      if (succeeded && existingPayment?.orderId) {
        // Update order and sub-orders to PAID
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
  } catch (error) {
    console.error("M-Pesa webhook error:", error);
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Internal error" }, { status: 500 });
  }

  // Always return 200 to Safaricom to stop retries
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
