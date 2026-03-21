import { NextRequest, NextResponse } from "next/server";
import { initiateMpesaStk, MpesaStkError } from "@/lib/mpesa";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      phone?: string;
      amount?: number;
      accountReference?: string;
      description?: string;
    };

    const { phone, amount, accountReference, description } = body;

    if (!phone || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid phone or amount" },
        { status: 400 },
      );
    }

    const data = await initiateMpesaStk({
      phone,
      amount,
      accountReference,
      description,
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("M-Pesa STK error:", error);
    const details = error instanceof MpesaStkError ? error.details : undefined;
    return NextResponse.json(
      { error: "M-Pesa STK internal error", details },
      { status: 500 },
    );
  }
}

