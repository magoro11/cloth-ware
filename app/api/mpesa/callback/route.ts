import { NextRequest, NextResponse } from "next/server";

// This endpoint is called by Safaricom after STK Push completes.
// Configure the public HTTPS URL of this route in MPESA_CALLBACK_URL
// and on the Daraja portal.

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  console.log("M-Pesa callback payload:", JSON.stringify(body));

  // TODO: Map ResultCode / ResultDesc and update your database:
  // - If ResultCode === 0: mark payment as successful
  // - Else: mark as failed / cancelled
  //
  // Example (pseudo-code):
  // const resultCode = body.Body?.stkCallback?.ResultCode;
  // const merchantRequestId = body.Body?.stkCallback?.MerchantRequestID;
  // const checkoutRequestId = body.Body?.stkCallback?.CheckoutRequestID;

  return NextResponse.json(
    {
      ResultCode: 0,
      ResultDesc: "Callback received successfully",
    },
    { status: 200 },
  );
}

