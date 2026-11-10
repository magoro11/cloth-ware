"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser, requireRole, AuthError } from "@/lib/access";
import { prisma } from "@/lib/prisma";

const statusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELED",
  "REFUNDED",
]);

async function getOrderWithAccessCheck(orderId: string, userId: string, userRole: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      subOrders: {
        include: {
          items: {
            include: {
              variant: { include: { product: true } },
              product: true,
            },
          },
          vendor: { select: { businessName: true, id: true } },
          payment: true,
          refund: true,
          return: true,
        },
      },
      payments: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!order) throw new AuthError("Not found", 404);
  if (userRole === "ADMIN") return order;
  if (order.userId === userId) return order;
  // Vendor check: does this user own any sub-order in this order?
  const ownsSubOrder = order.subOrders.some((so) => so.vendorId === userId);
  if (!ownsSubOrder) throw new AuthError("Forbidden", 403);
  return order;
}

export async function getMyOrders() {
  const user = await requireUser();
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: {
      subOrders: {
        include: {
          items: {
            include: {
              variant: true,
              product: { select: { title: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } },
            },
          },
          vendor: { select: { businessName: true, id: true } },
          payment: true,
        },
      },
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return { orders };
}

export async function getMyOrderDetail(input: { orderId: string }) {
  const user = await requireUser();
  const order = await getOrderWithAccessCheck(input.orderId, user.id, user.role);
  return { order };
}

export async function getSellerOrders() {
  const user = await requireRole(["LENDER", "ADMIN"]);
  const where = user.role === "ADMIN" ? {} : { subOrders: { some: { vendor: { userId: user.id } } } };
  const orders = await prisma.order.findMany({
    where,
    include: {
      subOrders: {
        where: user.role === "ADMIN" ? undefined : { vendor: { userId: user.id } },
        include: {
          items: {
            include: {
              variant: { include: { product: true } },
              product: true,
            },
          },
          vendor: { select: { businessName: true, id: true } },
          payment: true,
        },
      },
      payments: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return { orders };
}

export async function updateSubOrderStatus(input: { subOrderId: string; status: string }) {
  const user = await requireRole(["LENDER", "ADMIN"]);
  const parsed = statusSchema.parse(input.status);

  const subOrder = await prisma.subOrder.findUnique({
    where: { id: input.subOrderId },
    include: { vendor: true, order: true },
  });
  if (!subOrder) throw new AuthError("Not found", 404);

  if (user.role === "LENDER" && subOrder.vendor.userId !== user.id) {
    throw new AuthError("Forbidden", 403);
  }

  const data: any = { status: parsed };
  if (parsed === "SHIPPED") data.shippedAt = new Date();
  if (parsed === "DELIVERED") data.deliveredAt = new Date();

  const updated = await prisma.subOrder.update({
    where: { id: input.subOrderId },
    data,
    include: {
      items: {
        include: {
          variant: { include: { product: true } },
          product: true,
        },
      },
      vendor: { select: { businessName: true } },
    },
  });

  // Check if all sub-orders in the parent order are delivered/canceled to update parent
  const allSubOrders = await prisma.subOrder.findMany({
    where: { orderId: subOrder.orderId },
    select: { status: true },
  });
  const allDelivered = allSubOrders.every((so) => so.status === "DELIVERED");
  const allCanceled = allSubOrders.every((so) => so.status === "CANCELED");
  const allRefunded = allSubOrders.every((so) => so.status === "REFUNDED");

  if (allDelivered) {
    await prisma.order.update({ where: { id: subOrder.orderId }, data: { status: "DELIVERED" } });
  } else if (allCanceled) {
    await prisma.order.update({ where: { id: subOrder.orderId }, data: { status: "CANCELED" } });
  } else if (allRefunded) {
    await prisma.order.update({ where: { id: subOrder.orderId }, data: { status: "REFUNDED" } });
  }

  revalidatePath("/seller/orders");
  revalidatePath("/admin/orders");
  revalidatePath("/account/orders");
  return { subOrder: updated };
}

export async function cancelMyOrder(input: { orderId: string }) {
  const user = await requireUser();
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { id: true, userId: true, status: true },
  });
  if (!order) throw new AuthError("Not found", 404);
  if (order.userId !== user.id) throw new AuthError("Forbidden", 403);
  if (!["PENDING", "PAID"].includes(order.status)) {
    return { error: "Order cannot be cancelled at this stage" };
  }

  const updated = await prisma.order.update({ where: { id: input.orderId }, data: { status: "CANCELED" } });

  // Cancel all sub-orders and restock
  const subOrders = await prisma.subOrder.findMany({
    where: { orderId: input.orderId },
    include: { items: { include: { variant: true } } },
  });

  const stockUpdates: Promise<unknown>[] = [];
  for (const so of subOrders) {
    for (const item of so.items) {
      if (item.variantId) {
        stockUpdates.push(
          prisma.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          })
        );
      }
    }
  }

  await prisma.$transaction([
    ...subOrders.map((so) =>
      prisma.subOrder.update({ where: { id: so.id }, data: { status: "CANCELED" } })
    ),
    ...stockUpdates,
  ] as any);

  revalidatePath("/account/orders");
  return { order: updated };
}
