"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser, requireRole, AuthError } from "@/lib/access";
import { prisma } from "@/lib/prisma";

const statusSchema = z.enum(["PENDING", "PAID", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELED", "REFUNDED"]);

async function getOrderWithSellerCheck(orderId: string, userId: string, userRole: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { variant: { include: { product: true } }, product: true } },
      payments: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!order) throw new AuthError("Not found", 404);
  if (userRole === "ADMIN") return order;
  if (order.userId === userId) return order;
  const ownsItem = order.items.some((item) => item.variant?.product.sellerId === userId);
  if (!ownsItem) throw new AuthError("Forbidden", 403);
  return order;
}

export async function getMyOrders() {
  const user = await requireUser();
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: { include: { variant: true, product: { select: { title: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } } } }, payments: true },
    orderBy: { createdAt: "desc" },
  });
  return { orders };
}

export async function getMyOrderDetail(input: { orderId: string }) {
  const user = await requireUser();
  const order = await getOrderWithSellerCheck(input.orderId, user.id, user.role);
  return { order };
}

export async function getSellerOrders() {
  const user = await requireRole(["LENDER", "ADMIN"]);
  const where = user.role === "ADMIN" ? {} : { items: { some: { variant: { product: { sellerId: user.id } } } } };
  const orders = await prisma.order.findMany({
    where,
    include: {
      items: { include: { variant: { include: { product: true } } } },
      user: { select: { id: true, name: true, email: true } },
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return { orders };
}

export async function updateOrderStatus(input: { orderId: string; status: string }) {
  const user = await requireRole(["LENDER", "ADMIN"]);
  const parsed = statusSchema.parse(input.status);

  const order = await getOrderWithSellerCheck(input.orderId, user.id, user.role);
  if (user.role === "LENDER" && order.userId === user.id) {
    // A customer-role-ish check: LENDER who is also the buyer can't arbitrarily ship their own purchase unless admin
    if (!order.items.some((i) => i.variant?.product.sellerId === user.id)) throw new AuthError("Forbidden", 403);
  }

  const updated = await prisma.order.update({
    where: { id: input.orderId },
    data: { status: parsed },
  });
  revalidatePath("/seller/orders");
  revalidatePath("/admin/orders");
  revalidatePath("/account/orders");
  return { order: updated };
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
  // Restock variants
  const items = await prisma.orderItem.findMany({ where: { orderId: input.orderId }, include: { variant: true } });
  await prisma.$transaction(
    items.map((item) =>
      item.variantId
        ? prisma.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } })
        : prisma.product.update({ where: { id: item.productId }, data: {} }),
    ),
  );
  revalidatePath("/account/orders");
  return { order: updated };
}
