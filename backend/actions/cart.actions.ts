"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function getCart(input: {
  userId?: string;
  sessionId?: string;
}) {
  const userId = await getSessionUserId();
  const effectiveUserId = input.userId ?? userId;
  const sessionId = input.sessionId;

  if (!effectiveUserId && !sessionId) {
    return { cart: null };
  }

  let cart: any = await prisma.storeCart.findFirst({
    where: effectiveUserId ? { userId: effectiveUserId } : { sessionId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                select: { id: true, title: true, slug: true, isPublished: true, sellerId: true },
                include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!cart) {
    cart = await prisma.storeCart.create({
      data: {
        userId: effectiveUserId ?? undefined,
        sessionId: effectiveUserId ? undefined : sessionId,
      },
      include: { items: { include: { variant: true }, orderBy: { createdAt: "asc" } } },
    });
  }

  return { cart };
}

export async function addToCart(input: {
  variantId: string;
  quantity: number;
  sessionId?: string;
}) {
  const userId = await getSessionUserId();
  const quantityNum = Math.max(1, Math.floor(Number(input.quantity || 1)));

  const variant = await prisma.productVariant.findUnique({
    where: { id: input.variantId },
    include: { product: { select: { id: true, title: true, isPublished: true } } },
  });
  if (!variant || !variant.product.isPublished || !variant.isActive) {
    return { error: "Variant unavailable" };
  }
  if (variant.stock < quantityNum) {
    return { error: `Only ${variant.stock} in stock` };
  }

  let cart;
  if (userId) {
    const existing = await prisma.storeCart.findFirst({ where: { userId } });
    cart = existing ?? (await prisma.storeCart.create({ data: { userId } }));
  } else {
    if (!input.sessionId) return { error: "Session required" };
    const existing = await prisma.storeCart.findFirst({ where: { sessionId: input.sessionId } });
    cart = existing ?? (await prisma.storeCart.create({ data: { sessionId: input.sessionId } }));
  }

  const existingItem = await prisma.storeCartItem.findFirst({
    where: { cartId: cart.id, variantId: input.variantId },
  });

  if (existingItem) {
    const newQty = existingItem.quantity + quantityNum;
    if (variant.stock < newQty) {
      return { error: `Only ${variant.stock} in stock` };
    }
    await prisma.storeCartItem.update({
      where: { id: existingItem.id },
      data: { quantity: newQty },
    });
  } else {
    await prisma.storeCartItem.create({
      data: { cartId: cart.id, variantId: input.variantId, quantity: quantityNum },
    });
  }

  revalidatePath("/cart");
  return { ok: true };
}

export async function updateCartItem(input: { cartItemId: string; quantity: number }) {
  const userId = await getSessionUserId();
  const quantityNum = Math.max(0, Math.floor(Number(input.quantity || 0)));

  const item = await prisma.storeCartItem.findUnique({
    where: { id: input.cartItemId },
    include: { cart: true, variant: true },
  });
  if (!item) return { error: "Item not found" };
  if (userId && item.cart.userId !== userId) return { error: "Forbidden" };
  if (!userId && item.cart.sessionId && item.cart.userId) return { error: "Forbidden" };

  const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
  if (variant && variant.stock < quantityNum) {
    return { error: `Only ${variant.stock} in stock` };
  }

  if (quantityNum === 0) {
    await prisma.storeCartItem.delete({ where: { id: input.cartItemId } });
  } else {
    await prisma.storeCartItem.update({ where: { id: input.cartItemId }, data: { quantity: quantityNum } });
  }

  revalidatePath("/cart");
  return { ok: true };
}

export async function removeCartItem(input: { cartItemId: string }) {
  const userId = await getSessionUserId();
  const item = await prisma.storeCartItem.findUnique({
    where: { id: input.cartItemId },
    include: { cart: true },
  });
  if (!item) return { error: "Item not found" };
  if (userId && item.cart.userId !== userId) return { error: "Forbidden" };
  if (!userId && item.cart.sessionId && item.cart.userId) return { error: "Forbidden" };

  await prisma.storeCartItem.delete({ where: { id: input.cartItemId } });
  revalidatePath("/cart");
  return { ok: true };
}

export async function clearCart(input: { sessionId?: string }) {
  const userId = await getSessionUserId();
  if (userId) {
    await prisma.storeCart.deleteMany({ where: { userId } });
  } else if (input.sessionId) {
    await prisma.storeCart.deleteMany({ where: { sessionId: input.sessionId } });
  }
  revalidatePath("/cart");
  return { ok: true };
}

export async function mergeGuestCart(input: { sessionId: string }) {
  const userId = await getSessionUserId();
  if (!userId || !input.sessionId) return { ok: true };

  const guestCart = await prisma.storeCart.findFirst({
    where: { sessionId: input.sessionId },
    include: { items: true },
  });
  if (!guestCart) return { ok: true };

  const userCart = await prisma.storeCart.findFirst({ where: { userId } });
  const target = userCart ?? (await prisma.storeCart.create({ data: { userId } }));

  for (const item of guestCart.items) {
    const existing = await prisma.storeCartItem.findFirst({
      where: { cartId: target.id, variantId: item.variantId },
    });
    const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
    const qty = variant ? Math.min(item.quantity, variant.stock) : 0;
    if (qty <= 0) continue;
    if (existing) {
      const newQty = Math.min(existing.quantity + qty, variant?.stock ?? 0);
      await prisma.storeCartItem.update({ where: { id: existing.id }, data: { quantity: newQty } });
    } else {
      await prisma.storeCartItem.create({
        data: { cartId: target.id, variantId: item.variantId, quantity: qty },
      });
    }
  }

  await prisma.storeCartItem.deleteMany({ where: { cartId: guestCart.id } });
  await prisma.storeCart.delete({ where: { id: guestCart.id } });
  revalidatePath("/cart");
  return { ok: true };
}
