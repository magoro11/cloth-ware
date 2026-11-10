"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { initiateMpesaStk } from "@/backend/lib/mpesa";
import { getStripe, createPaymentIntent } from "@/backend/lib/payments/stripe";
import { sendEmailNotification } from "@/backend/lib/notifications";

const checkoutSchema = z.object({
  paymentMethod: z.enum(["CARD", "MPESA", "COD"]),
  customerPhone: z.string().optional(),
  addressId: z.string().optional(),
  shippingAddress: z
    .object({
      name: z.string().min(1),
      phone: z.string().min(1),
      line1: z.string().min(1),
      line2: z.string().optional().nullable(),
      city: z.string().min(1),
      county: z.string().min(1),
      town: z.string().optional().nullable(),
      postalCode: z.string().optional().nullable(),
      country: z.string().default("KE"),
    })
    .optional(),
  sessionId: z.string().optional(),
  couponCode: z.string().optional().nullable(),
});

type CheckoutLineItem = {
  productId: string;
  variantId: string | null;
  productName: string;
  variantSku: string | null;
  quantity: number;
  price: number; // minor units KES
  vendorId: string;
  vendorName: string;
  weightG: number | null;
};

type VendorGroup = {
  vendorId: string;
  vendorName: string;
  items: CheckoutLineItem[];
  subtotal: number;
  shipping: number;
  total: number;
  commissionAmount: number;
};

export type CheckoutResult =
  | { ok: true; orderId: string; subOrderIds: string[]; paymentMethod: string; clientSecret?: string; redirectUrl?: string; checkoutRequestId?: string }
  | { ok: false; error: string; status: number };

async function getClientIp(): Promise<string> {
  return "checkout";
}

function computeShipping(county: string | undefined, vendorSubtotal: number): { fee: number; estDaysMin: number; estDaysMax: number; freeThreshold: number } {
  // Default shipping if no zone matches
  const defaultFee = 15000; // KES 150.00 in minor units
  const defaultFreeThreshold = 500000; // KES 5,000
  return {
    fee: defaultFee,
    estDaysMin: 2,
    estDaysMax: 5,
    freeThreshold: defaultFreeThreshold,
  };
}

function isCodEligible(orderTotal: number, county: string | undefined): boolean {
  // COD eligible for orders under KES 50,000 and within Nairobi/Mombasa/Kisumu
  const codEligibleCounties = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"];
  const maxCodOrder = 5000000; // KES 50,000 in minor units
  return orderTotal <= maxCodOrder && county ? codEligibleCounties.includes(county) : false;
}

export async function checkoutAction(input: {
  paymentMethod: "CARD" | "MPESA" | "COD";
  customerPhone?: string;
  addressId?: string;
  shippingAddress?: {
    name: string;
    phone: string;
    line1: string;
    line2?: string | null;
    city: string;
    county: string;
    town?: string | null;
    postalCode?: string | null;
    country?: string;
  };
  sessionId?: string;
  couponCode?: string | null;
}): Promise<CheckoutResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, error: "Sign in to checkout", status: 401 };
  }

  const parsed = checkoutSchema.parse(input);

  // Rate limit per user
  const ip = await getClientIp();
  const limited = rateLimit(`checkout:${userId}`, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!limited.success) {
    return { ok: false, error: "Too many checkout attempts", status: 429 };
  }

  // Fetch user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, emailVerified: true },
  });
  if (!user || !user.emailVerified) {
    return { ok: false, error: "Verify your email before checking out", status: 403 };
  }

  // Resolve cart
  let cartItems: Array<{
    id: string;
    variantId: string | null;
    quantity: number;
    variant: {
      id: string;
      sku: string;
      size: string | null;
      color: string | null;
      storage: string | null;
      price: number | null;
      stock: number;
      isActive: boolean;
      product: {
        id: string;
        title: string;
        slug: string;
        isPublished: boolean;
        vendorId: string;
        basePrice: number;
        weightG: number | null;
        images: { url: string }[];
        vendor: { businessName: string };
      };
    };
  }> = [];

  if (parsed.sessionId) {
    const cart = await prisma.cart.findFirst({
      where: { sessionId: parsed.sessionId, userId: null },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                    isPublished: true,
                    vendorId: true,
                    basePrice: true,
                    weightG: true,
                    images: { orderBy: { sortOrder: "asc" }, take: 1 },
                    vendor: { select: { businessName: true } },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (cart) {
      cartItems = cart.items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        quantity: item.quantity,
        variant: item.variant!,
      }));
    }
  } else {
    const cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                    isPublished: true,
                    vendorId: true,
                    basePrice: true,
                    weightG: true,
                    images: { orderBy: { sortOrder: "asc" }, take: 1 },
                    vendor: { select: { businessName: true } },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (cart) {
      cartItems = cart.items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        quantity: item.quantity,
        variant: item.variant!,
      }));
    }
  }

  if (cartItems.length === 0) {
    return { ok: false, error: "Cart is empty", status: 400 };
  }

  // Resolve shipping address
  let shippingAddressSnapshot: {
    name: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    county: string;
    town: string | null;
    postalCode: string | null;
    country: string;
  } | null = null;
  let pickupStationId: string | null = null;

  if (parsed.addressId) {
    const address = await prisma.address.findUnique({
      where: { id: parsed.addressId },
    });
    if (!address || address.userId !== userId) {
      return { ok: false, error: "Address not found", status: 404 };
    }
    shippingAddressSnapshot = {
      name: address.name,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 ?? null,
      city: address.city,
      county: address.county,
      town: address.town ?? null,
      postalCode: address.postalCode ?? null,
      country: address.country,
    };
  } else if (parsed.shippingAddress) {
    shippingAddressSnapshot = {
      name: parsed.shippingAddress.name,
      phone: parsed.shippingAddress.phone,
      line1: parsed.shippingAddress.line1,
      line2: parsed.shippingAddress.line2 ?? null,
      city: parsed.shippingAddress.city,
      county: parsed.shippingAddress.county,
      town: parsed.shippingAddress.town ?? null,
      postalCode: parsed.shippingAddress.postalCode ?? null,
      country: parsed.shippingAddress.country ?? "KE",
    };
  }

  const county = shippingAddressSnapshot?.county;

  // Validate stock and recompute prices server-side. Never trust client prices.
  let grandSubtotal = 0;
  let grandShipping = 0;
  const lineItems: CheckoutLineItem[] = [];

  for (const item of cartItems) {
    const variant = item.variant;
    const product = variant.product;

    if (!variant.isActive || !product.isPublished) {
      return { ok: false, error: `${product.title} is no longer available`, status: 400 };
    }
    if (variant.stock < item.quantity) {
      return {
        ok: false,
        error: `Only ${variant.stock} left of ${product.title} (${variant.size}${variant.color ? ` / ${variant.color}` : ""})`,
        status: 400,
      };
    }

    const unitPrice = variant.price ?? product.basePrice;
    if (!unitPrice || unitPrice <= 0) {
      return { ok: false, error: `${product.title} has no price set`, status: 400 };
    }

    lineItems.push({
      productId: product.id,
      variantId: variant.id,
      productName: product.title,
      variantSku: variant.sku,
      quantity: item.quantity,
      price: unitPrice,
      vendorId: product.vendorId,
      vendorName: product.vendor.businessName,
      weightG: product.weightG,
    });

    grandSubtotal += unitPrice * item.quantity;
  }

  // Group by vendor
  const vendorMap = new Map<string, VendorGroup>();
  for (const item of lineItems) {
    if (!vendorMap.has(item.vendorId)) {
      vendorMap.set(item.vendorId, {
        vendorId: item.vendorId,
        vendorName: item.vendorName,
        items: [],
        subtotal: 0,
        shipping: 0,
        total: 0,
        commissionAmount: 0,
      });
    }
    const group = vendorMap.get(item.vendorId)!;
    group.items.push(item);
    group.subtotal += item.price * item.quantity;
  }

  // Calculate shipping per vendor
  for (const group of vendorMap.values()) {
    const shipping = computeShipping(county, group.subtotal);
    group.shipping = shipping.fee;
    group.total = group.subtotal + shipping.fee;
    // Commission: 10% basis points (1000 = 10%)
    group.commissionAmount = Math.round((group.subtotal * 1000) / 10000);
    grandShipping += shipping.fee;
  }

  const grandTotal = grandSubtotal + grandShipping;

  // COD eligibility check
  if (parsed.paymentMethod === "COD" && !isCodEligible(grandTotal, county)) {
    return {
      ok: false,
      error: "Cash on Delivery is not available for this order value or location",
      status: 400,
    };
  }

  // Generate order number
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${userId.slice(-6)}`;

  let order;
  let subOrderIds: string[] = [];

  try {
    order = await prisma.$transaction(async (tx) => {
      // Create parent order
      const createdOrder = await tx.order.create({
        data: {
          userId,
          orderNumber,
          status: "PENDING",
          subtotal: grandSubtotal,
          shipping: grandShipping,
          tax: 0,
          total: grandTotal,
          currency: "KES",
          shippingAddress: shippingAddressSnapshot ? shippingAddressSnapshot : undefined,
          pickupStationId,
        },
      });

      // Create sub-orders per vendor
      for (const [, group] of vendorMap) {
        const subOrderNumber = `SUB-${Date.now().toString(36).toUpperCase()}-${group.vendorId.slice(-6)}`;
        const subOrder = await tx.subOrder.create({
          data: {
            orderId: createdOrder.id,
            vendorId: group.vendorId,
            subOrderNumber,
            status: "PENDING",
            subtotal: group.subtotal,
            shipping: group.shipping,
            commissionAmount: group.commissionAmount,
            total: group.total,
          },
        });
        subOrderIds.push(subOrder.id);

        // Create order items (snapshot)
        await tx.orderItem.createMany({
          data: group.items.map((item) => ({
            subOrderId: subOrder.id,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantSku: item.variantSku,
            quantity: item.quantity,
            price: item.price,
          })),
        });

        // Decrement stock
        for (const item of group.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { decrement: item.quantity } },
            });
          }
        }
      }

      // Create payment record(s)
      if (parsed.paymentMethod === "COD") {
        await tx.payment.create({
          data: {
            orderId: createdOrder.id,
            provider: "PAY_ON_DELIVERY",
            providerPaymentId: `cod-${createdOrder.id}`,
            status: "PENDING",
            amount: grandTotal,
            currency: "KES",
            userId,
          },
        });
      } else if (parsed.paymentMethod === "CARD") {
        const stripe = getStripe();
        if (!stripe) {
          throw new Error("Stripe not configured");
        }
        const paymentIntent = await stripe.paymentIntents.create({
          amount: grandTotal,
          currency: "kes",
          receipt_email: user.email,
          metadata: {
            orderId: createdOrder.id,
            userId,
            paymentMethod: "CARD",
          },
        });
        await tx.payment.create({
          data: {
            orderId: createdOrder.id,
            provider: "STRIPE",
            providerPaymentId: paymentIntent.id,
            status: "PENDING",
            amount: grandTotal,
            currency: "KES",
            userId,
          },
        });
        // Store client secret in a way we can return it
        // We'll capture it after the transaction
        Object.assign(createdOrder, { _clientSecret: paymentIntent.client_secret });
      } else if (parsed.paymentMethod === "MPESA") {
        if (!parsed.customerPhone) {
          throw new Error("Phone number required for M-Pesa");
        }
        // Initiate STK push
        const stkResponse = await initiateMpesaStk({
          phone: parsed.customerPhone,
          amount: Math.round(grandTotal / 100), // convert minor units to KES
          accountReference: createdOrder.id,
          description: `Order ${orderNumber}`,
        });
        await tx.payment.create({
          data: {
            orderId: createdOrder.id,
            provider: "MPESA_DARAJA",
            providerPaymentId: stkResponse.CheckoutRequestID,
            status: "PENDING",
            amount: grandTotal,
            currency: "KES",
            userId,
          },
        });
        Object.assign(createdOrder, { _checkoutRequestId: stkResponse.CheckoutRequestID });
      }

      return createdOrder;
    });

    // Handle post-transaction returns
    if (parsed.paymentMethod === "CARD") {
      const clientSecret = (order as any)._clientSecret as string | undefined;
      return {
        ok: true,
        orderId: order.id,
        subOrderIds,
        paymentMethod: "CARD",
        clientSecret,
      };
    }

    if (parsed.paymentMethod === "MPESA") {
      const checkoutRequestId = (order as any)._checkoutRequestId as string | undefined;
      return {
        ok: true,
        orderId: order.id,
        subOrderIds,
        paymentMethod: "MPESA",
        checkoutRequestId,
      };
    }

    // COD
    return {
      ok: true,
      orderId: order.id,
      subOrderIds,
      paymentMethod: "COD",
    };
  } catch (error: any) {
    console.error("Checkout error:", error);
    return { ok: false, error: error.message || "Failed to create order", status: 500 };
  }
}
