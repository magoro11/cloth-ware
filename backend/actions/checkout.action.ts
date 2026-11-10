"use server";

import { stripe } from "@/backend/lib/stripe";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmailNotification } from "@/backend/lib/notifications";
import { revalidatePath } from "next/cache";

const SHIPPING_CENTS = 0;
const TAX_RATE = 0; // KES prices shown inclusive

async function getClientIp(): Promise<string> {
  // In server actions we don't have the Request; use a stable per-action bucket.
  return "checkout";
}

export async function checkoutAction(input: {
  sessionId?: string;
  addressId?: string;
  shippingAddress?: { name: string; phone: string; line1: string; line2?: string; city: string; country: string; postalCode?: string };
}) {
  const userId = (await auth())?.user?.id;
  if (!userId) return { error: "Sign in to checkout", status: 401 };

  const ip = await getClientIp();
  const limited = rateLimit(`checkout:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!limited.success) return { error: "Too many checkout attempts", status: 429 };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, emailVerified: true },
  });
  if (!user || !user.emailVerified) {
    return { error: "Verify your email before checking out", status: 403 };
  }

  let cart;
  if (input.sessionId) {
    const res = await prisma.storeCart.findFirst({
      where: { sessionId: input.sessionId },
      include: { items: { include: { variant: { include: { product: { include: { images: { take: 1 } } } } } } } },
    });
    cart = res;
  } else {
    cart = await prisma.storeCart.findFirst({
      where: { userId },
      include: { items: { include: { variant: { include: { product: { include: { images: { take: 1 } } } } } } } },
    });
  }

  if (!cart || cart.items.length === 0) {
    return { error: "Cart is empty", status: 400 };
  }

  // Validate stock and recompute prices server-side. Never trust client prices.
  let subtotal = 0;
  const lineItems: any[] = [];
  const orderItemsData: any[] = [];

  for (const item of cart.items) {
    const variant = item.variant;
    const product = variant.product;
    if (!variant.isActive || !product.isPublished) {
      return { error: `${product.title} is no longer available`, status: 400 };
    }
    if (variant.stock < item.quantity) {
      return { error: `Only ${variant.stock} left of ${product.title} (${variant.size}${variant.color ? ` / ${variant.color}` : ""})`, status: 400 };
    }

    const unitPrice = variant.price ?? product.basePrice;
    if (!unitPrice || unitPrice <= 0) {
      return { error: `${product.title} has no price set`, status: 400 };
    }

    subtotal += unitPrice * item.quantity;

    lineItems.push({
      price_data: {
        currency: "kes",
        product_data: {
          name: product.title,
          description: product.description?.slice(0, 200) ?? undefined,
          images: variant.product.images?.[0]?.url ? [variant.product.images[0].url] : [],
        },
        unit_amount: unitPrice,
      },
      quantity: item.quantity,
    });

    orderItemsData.push({
      productId: product.id,
      variantId: variant.id,
      productName: product.title,
      variantSku: variant.sku,
      quantity: item.quantity,
      price: unitPrice,
    });
  }

  const shipping = SHIPPING_CENTS;
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + shipping + tax;

  const addressSnapshot = input.shippingAddress ?? null;

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId,
          status: "PENDING",
          subtotal,
          shipping,
          tax,
          total,
          currency: "KES",
          shippingAddress: addressSnapshot ? addressSnapshot : undefined,
        },
      });

      await tx.orderItem.createMany({ data: orderItemsData.map((d) => ({ ...d, orderId: createdOrder.id })) });

      const providerPaymentId = `chk_${createdOrder.id}`;
      await tx.payment.create({
        data: {
          orderId: createdOrder.id,
          provider: "STRIPE",
          providerPaymentId,
          status: "PENDING",
          amount: total,
          currency: "KES",
        },
      });

      return createdOrder;
    });
  } catch (error) {
    return { error: "Failed to create order", status: 500 };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "kes",
      customer_email: user.email,
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?orderId=${order.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cart`,
      metadata: { orderId: order.id, userId },
    });

    await prisma.payment.updateMany({
      where: { orderId: order.id },
      data: { providerPaymentId: session.id },
    });

    return { url: session.url, orderId: order.id };
  } catch (error) {
    await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELED" } });
    return { error: "Payment session failed", status: 500 };
  }
}
