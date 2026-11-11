import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { processPayment, verifyPayment, getAvailablePaymentMethods } from "@/backend/lib/payments";

export const dynamic = "force-dynamic";

const prismaAny = prisma as any;

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
    const cart = await prisma.cart.findFirst({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const cartItems = cart.items;
    const validatedItems: { productId: string; amount: number }[] = [];
    let totalAmount = 0;
    for (const entry of cartItems) {
      const currentItem = entry.product;
      if (!currentItem || !currentItem.isPublished) {
        return NextResponse.json(
          { error: `Product ${currentItem?.title || entry.productId} is no longer available` },
          { status: 409 }
        );
      }

      validatedItems.push({
        productId: entry.productId,
        amount: currentItem.basePrice ?? 0,
      });
      totalAmount += currentItem.basePrice ?? 0;
    }

    const orderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const paymentResponse = await processPayment({
      amount: totalAmount,
      currency: "KES",
      paymentMethod: paymentMethod as any,
      orderId,
      customerEmail: session.user.email || undefined,
      customerPhone: paymentMethod === "mpesa" ? mpesaPhone : undefined,
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
      const productIds = validatedItems.map((item) => item.productId);
      const uniqueItemIds = Array.from(new Set(productIds));

      await tx.product.updateMany({
        where: { id: { in: uniqueItemIds } },
        data: { isPublished: false },
      });

      const order = await tx.order.create({
        data: {
          userId: session.user.id,
          orderNumber: orderId,
          status: "PENDING",
          subtotal: totalAmount,
          shipping: 0,
          tax: 0,
          total: totalAmount,
          shippingAddress: address as any,
        },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return { count: 1, firstId: orderId, paymentId: paymentResponse.paymentId };
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
