import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { processPayment, verifyPayment, getAvailablePaymentMethods } from "@/backend/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const address = body.address as { line1: string; line2: string; city: string; country: string } | undefined;
  const paymentMethod = body.paymentMethod as string | undefined;
  const mpesaPhone = body.mpesaPhone as string | undefined;

  if (!address?.line1 || !address?.city || !address?.country || !paymentMethod) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const availableMethods = getAvailablePaymentMethods();
  if (!availableMethods.includes(paymentMethod as any)) {
    return NextResponse.json({ error: "Payment method not available" }, { status: 400 });
  }

  try {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: session.user.id },
      include: { item: true },
    });

    if (cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const validatedItems: { itemId: string; amount: number }[] = [];
    let totalAmount = 0;
    for (const entry of cartItems) {
      const currentItem = await prisma.item.findUnique({
        where: { id: entry.itemId },
        select: { id: true, isAvailable: true, sellingPrice: true },
      });

      if (!currentItem || !currentItem.isAvailable) {
        return NextResponse.json(
          { error: `Item ${entry.item.title || entry.itemId} is no longer available` },
          { status: 409 }
        );
      }

      validatedItems.push({
        itemId: entry.itemId,
        amount: currentItem.sellingPrice ?? 0,
      });
      totalAmount += currentItem.sellingPrice ?? 0;
    }

    const orderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    const paymentResponse = await processPayment({
      amount: totalAmount,
      currency: "KES",
      paymentMethod: paymentMethod as any,
      orderId,
      customerEmail: session.user.email || undefined,
      customerPhone: paymentMethod === "mpesa" ? mpesaPhone : (session.user as any).phone || undefined,
      customerName: session.user.name || undefined,
      metadata: {
        userId: session.user.id,
        itemCount: String(cartItems.length),
      },
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?orderId=${orderId}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout`,
    });

    if (!paymentResponse.success) {
      return NextResponse.json({ error: paymentResponse.error || "Payment initiation failed" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const itemIds = validatedItems.map((item) => item.itemId);
      const uniqueItemIds = Array.from(new Set(itemIds));

      await tx.item.updateMany({
        where: { id: { in: uniqueItemIds } },
        data: { isAvailable: false },
      });

      const purchases = await tx.purchase.createMany({
        data: validatedItems.map((item) => ({
          itemId: item.itemId,
          buyerId: session!.user.id,
          amount: item.amount,
          commissionAmount: Math.round(item.amount * 0.1),
          status: "PENDING",
        })),
      });

      await tx.cartItem.deleteMany({ where: { userId: session!.user.id } });

      return { count: purchases.count, firstId: orderId, paymentId: paymentResponse.paymentId };
    });

    return NextResponse.json({ 
      orderId: result.firstId, 
      paymentId: result.paymentId,
      clientSecret: paymentResponse.clientSecret,
      redirectUrl: paymentResponse.redirectUrl,
      checkoutRequestId: paymentResponse.checkoutRequestId,
    }, { status: 201 });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Unable to place order" }, { status: 500 });
  }
}
