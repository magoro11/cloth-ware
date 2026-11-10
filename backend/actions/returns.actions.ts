"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser, AuthError } from "@/lib/access";
import { prisma } from "@/lib/prisma";

const returnRequestSchema = z.object({
  orderId: z.string().min(1),
  subOrderId: z.string().optional().nullable(),
  reason: z.string().min(5).max(1000),
  note: z.string().max(1000).optional().nullable(),
});

export async function createReturnRequest(input: z.infer<typeof returnRequestSchema>) {
  const user = await requireUser();
  const parsed = returnRequestSchema.parse(input);

  // Verify order belongs to user
  const order = await prisma.order.findUnique({
    where: { id: parsed.orderId },
    select: { id: true, userId: true, status: true },
  });
  if (!order) throw new AuthError("Order not found", 404);
  if (order.userId !== user.id) throw new AuthError("Forbidden", 403);

  // If subOrderId provided, verify it belongs to this order
  if (parsed.subOrderId) {
    const subOrder = await prisma.subOrder.findUnique({
      where: { id: parsed.subOrderId },
      select: { id: true, orderId: true, status: true },
    });
    if (!subOrder || subOrder.orderId !== parsed.orderId) {
      throw new AuthError("Sub-order not found", 404);
    }
    if (subOrder.status !== "DELIVERED") {
      return { error: "Can only request return for delivered items" };
    }
  }

  // Check for existing pending return on same order/sub-order
  const existing = await prisma.returnRequest.findFirst({
    where: {
      orderId: parsed.orderId,
      ...(parsed.subOrderId ? { subOrderId: parsed.subOrderId } : {}),
      status: { in: ["REQUESTED", "APPROVED", "PICKUP_SCHEDULED", "RECEIVED"] },
    },
  });
  if (existing) {
    return { error: "A return request already exists for this order" };
  }

  const returnRequest = await prisma.returnRequest.create({
    data: {
      orderId: parsed.orderId,
      subOrderId: parsed.subOrderId ?? null,
      userId: user.id,
      reason: parsed.reason,
      note: parsed.note ?? null,
      status: "REQUESTED",
    },
    include: {
      subOrder: { select: { subOrderNumber: true, status: true, vendorId: true } },
    },
  });

  revalidatePath("/account/orders");
  revalidatePath("/account/returns");
  return { returnRequest };
}

export async function listReturnRequests() {
  const user = await requireUser();
  const returns = await prisma.returnRequest.findMany({
    where: { userId: user.id },
    include: {
      order: { select: { orderNumber: true, status: true } },
      subOrder: { select: { subOrderNumber: true, status: true, vendorId: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return { returns };
}

const refundRequestSchema = z.object({
  orderId: z.string().min(1),
  subOrderId: z.string().optional().nullable(),
  reason: z.string().min(5).max(1000),
  amount: z.number().int().nonnegative(),
});

export async function requestRefund(input: z.infer<typeof refundRequestSchema>) {
  const user = await requireUser();
  const parsed = refundRequestSchema.parse(input);

  const order = await prisma.order.findUnique({
    where: { id: parsed.orderId },
    select: { id: true, userId: true, status: true },
  });
  if (!order) throw new AuthError("Order not found", 404);
  if (order.userId !== user.id) throw new AuthError("Forbidden", 403);

  const existing = await prisma.refund.findFirst({
    where: {
      orderId: parsed.orderId,
      ...(parsed.subOrderId ? { subOrderId: parsed.subOrderId } : {}),
      status: { in: ["REQUESTED", "APPROVED", "PROCESSING"] },
    },
  });
  if (existing) {
    return { error: "A refund request already exists for this order" };
  }

  const refund = await prisma.refund.create({
    data: {
      orderId: parsed.orderId,
      subOrderId: parsed.subOrderId ?? null,
      userId: user.id,
      amount: parsed.amount,
      reason: parsed.reason,
      status: "REQUESTED",
    },
  });

  revalidatePath("/account/orders");
  revalidatePath("/account/refunds");
  return { refund };
}

export async function listRefunds() {
  const user = await requireUser();
  const refunds = await prisma.refund.findMany({
    where: { userId: user.id },
    include: {
      order: { select: { orderNumber: true, status: true } },
      subOrder: { select: { subOrderNumber: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return { refunds };
}

const couponUseSchema = z.object({
  code: z.string().min(1).max(50),
});

export async function validateCoupon(input: z.infer<typeof couponUseSchema>) {
  const user = await requireUser();
  const parsed = couponUseSchema.parse(input);

  const coupon = await prisma.coupon.findUnique({
    where: { code: parsed.code.toUpperCase() },
  });
  if (!coupon) {
    return { valid: false, error: "Invalid coupon code" };
  }

  const now = new Date();
  if (!coupon.isActive) {
    return { valid: false, error: "Coupon is not active" };
  }
  if (now < coupon.validFrom || now > coupon.validTo) {
    return { valid: false, error: "Coupon has expired" };
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, error: "Coupon usage limit reached" };
  }

  // Check per-user limit
  const userUsage = await prisma.order.count({
    where: {
      userId: user.id,
      ...(coupon.appliesToVendors.length > 0
        ? { subOrders: { some: { vendorId: { in: coupon.appliesToVendors } } } }
        : {}),
    },
  });
  if (userUsage >= coupon.perUserLimit) {
    return { valid: false, error: "You have already used this coupon" };
  }

  return {
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minOrder: coupon.minOrder,
      maxDiscount: coupon.maxDiscount,
    },
  };
}

export async function listCoupons() {
  const user = await requireUser();
  const now = new Date();
  const coupons = await prisma.coupon.findMany({
    where: {
      isActive: true,
      validFrom: { lte: now },
      validTo: { gte: now },
    },
    orderBy: { createdAt: "desc" },
  });
  return { coupons };
}
