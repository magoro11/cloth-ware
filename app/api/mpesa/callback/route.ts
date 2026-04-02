import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorStatus } from "@/lib/errors";
import { isPrismaUnknownFieldError } from "@/lib/prisma-compat";

const prismaAny = prisma as any;

type MpesaCallbackItem = {
  Name?: string;
  Value?: string | number;
};

type MpesaCallbackBody = {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: {
        Item?: MpesaCallbackItem[];
      };
    };
  };
};

function getItemValue(items: MpesaCallbackItem[] | undefined, name: string) {
  return items?.find((item) => item.Name === name)?.Value;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as MpesaCallbackBody | null;

    if (!body) {
      return NextResponse.json(
        { ResultCode: 1, ResultDesc: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    const callback = body.Body?.stkCallback;
    const resultCode = callback?.ResultCode ?? 1;
    const resultDesc = callback?.ResultDesc ?? "Unknown callback result";
    const checkoutRequestId = callback?.CheckoutRequestID;
    const merchantRequestId = callback?.MerchantRequestID;
    const metadataItems = callback?.CallbackMetadata?.Item;
    const receiptNumber = String(getItemValue(metadataItems, "MpesaReceiptNumber") || "");

    if (!checkoutRequestId) {
      return NextResponse.json(
        { ResultCode: 1, ResultDesc: "Missing CheckoutRequestID" },
        { status: 400 },
      );
    }

    let booking = null;
    try {
      booking = await prismaAny.booking.findFirst({
        where: { mpesaCheckoutRequestId: checkoutRequestId },
        include: { item: true },
      });
    } catch (error) {
      if (!isPrismaUnknownFieldError(error)) throw error;
      booking = null;
    }

    if (!booking) {
      return NextResponse.json(
        { ResultCode: 0, ResultDesc: "Callback received but booking was not found" },
        { status: 200 },
      );
    }

    const existingPayment = await prisma.transaction.findFirst({
      where: {
        bookingId: booking.id,
        type: "RENTAL_PAYMENT",
        metadata: {
          path: ["mpesaCheckoutRequestId"],
          equals: checkoutRequestId,
        },
      },
      select: { id: true },
    }).catch(() => null);

    if (resultCode === 0) {
      if (!existingPayment) {
        await prisma.$transaction([
          prismaAny.booking.update({
            where: { id: booking.id },
            data: {
              status: "CONFIRMED",
              mpesaMerchantRequestId: merchantRequestId || null,
              mpesaReceiptNumber: receiptNumber || null,
              mpesaResultCode: resultCode,
              mpesaResultDesc: resultDesc,
              paidAt: new Date(),
            },
          }),
          prisma.transaction.create({
            data: {
              bookingId: booking.id,
              userId: booking.customerId,
              type: "RENTAL_PAYMENT",
              amount: booking.rentalAmount,
              metadata: {
                paymentProvider: "mpesa",
                mpesaCheckoutRequestId: checkoutRequestId,
                mpesaMerchantRequestId: merchantRequestId,
                mpesaReceiptNumber: receiptNumber || null,
              },
            },
          }),
          prisma.transaction.create({
            data: {
              bookingId: booking.id,
              userId: booking.customerId,
              type: "DEPOSIT_HOLD",
              amount: booking.securityDeposit,
              metadata: {
                paymentProvider: "mpesa",
                mpesaCheckoutRequestId: checkoutRequestId,
                mpesaMerchantRequestId: merchantRequestId,
              },
            },
          }),
          prisma.transaction.create({
            data: {
              bookingId: booking.id,
              type: "COMMISSION",
              amount: booking.commissionAmount,
              metadata: {
                paymentProvider: "mpesa",
                mpesaCheckoutRequestId: checkoutRequestId,
                mpesaMerchantRequestId: merchantRequestId,
              },
            },
          }),
        ]);
      }
    } else {
      try {
        await prismaAny.booking.update({
          where: { id: booking.id },
          data: {
            status: "CANCELED",
            mpesaMerchantRequestId: merchantRequestId || null,
            mpesaResultCode: resultCode,
            mpesaResultDesc: resultDesc,
          },
        });
      } catch (error) {
        if (!isPrismaUnknownFieldError(error)) throw error;
        await prismaAny.booking.update({
          where: { id: booking.id },
          data: { status: "CANCELED" },
        });
      }
    }

    return NextResponse.json(
      {
        ResultCode: 0,
        ResultDesc: "Callback received successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ResultCode: 1,
        ResultDesc: error instanceof Error ? error.message : "Callback processing failed",
      },
      { status: errorStatus(error, 400) },
    );
  }
}
