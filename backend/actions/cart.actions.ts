"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const cartIdSchema = z.object({
  sessionId: z.string().optional(),
  userId: z.string().optional(),
});

export type CartItemView = {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  product: {
    id: string;
    title: string;
    slug: string;
    isPublished: boolean;
    vendorId: string;
    vendorName: string;
    basePrice: number;
    images: { url: string }[];
  };
  variant: {
    id: string;
    sku: string;
    size: string | null;
    color: string | null;
    storage: string | null;
    price: number | null;
    stock: number;
    isActive: boolean;
  } | null;
  unitPrice: number;
  lineTotal: number;
};

export type CartView = {
  id: string;
  userId: string | null;
  sessionId: string | null;
  items: CartItemView[];
  itemCount: number;
  subtotal: number;
  vendorGroups: {
    vendorId: string;
    vendorName: string;
    items: CartItemView[];
    subtotal: number;
  }[];
};

async function resolveCartIdentifier() {
  const session = await auth();
  return session?.user?.id ?? null;
}

async function getOrCreateCart(userId: string | null, sessionId: string | null) {
  if (!userId && !sessionId) {
    return { cart: null, created: false };
  }

  const where: Record<string, string | undefined> = {};
  if (userId) where.userId = userId;
  else if (sessionId) where.sessionId = sessionId;

  let cart = await prisma.cart.findFirst({
    where,
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
                  vendor: { select: { businessName: true } },
                  basePrice: true,
                  images: { orderBy: { sortOrder: "asc" }, take: 1 },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        userId: userId ?? undefined,
        sessionId: userId ? undefined : sessionId,
      },
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
                    vendor: { select: { businessName: true } },
                    basePrice: true,
                    images: { orderBy: { sortOrder: "asc" }, take: 1 },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    return { cart, created: true };
  }

  return { cart, created: false };
}

export async function getCart(input: { sessionId?: string; userId?: string }) {
  const parsed = cartIdSchema.parse(input);
  const resolvedUserId = await resolveCartIdentifier();
  const effectiveUserId = parsed.userId ?? resolvedUserId;

  const { cart } = await getOrCreateCart(effectiveUserId, parsed.sessionId ?? null);
  if (!cart) {
    return { cart: null };
  }

  const items: CartItemView[] = cart.items.map((item) => {
    const product = item.variant?.product;
    const variant = item.variant;
    const unitPrice = variant?.price ?? product?.basePrice ?? 0;
    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId ?? null,
      quantity: item.quantity,
      product: {
        id: product?.id ?? "",
        title: product?.title ?? "",
        slug: product?.slug ?? "",
        isPublished: product?.isPublished ?? false,
        vendorId: product?.vendorId ?? "",
        vendorName: product?.vendor?.businessName ?? "",
        basePrice: product?.basePrice ?? 0,
        images: product?.images ?? [],
      },
      variant: variant
        ? {
            id: variant.id,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            storage: variant.storage,
            price: variant.price,
            stock: variant.stock,
            isActive: variant.isActive,
          }
        : null,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
    };
  });

  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal = items.reduce((acc, i) => acc + i.lineTotal, 0);

  // Group by vendor
  const vendorMap = new Map<string, { vendorId: string; vendorName: string; items: CartItemView[]; subtotal: number }>();
  for (const item of items) {
    const key = item.product.vendorId;
    if (!vendorMap.has(key)) {
      vendorMap.set(key, {
        vendorId: item.product.vendorId,
        vendorName: item.product.vendorName,
        items: [],
        subtotal: 0,
      });
    }
    const group = vendorMap.get(key)!;
    group.items.push(item);
    group.subtotal += item.lineTotal;
  }

  const vendorGroups = Array.from(vendorMap.values());

  return {
    cart: {
      id: cart.id,
      userId: cart.userId ?? null,
      sessionId: cart.sessionId ?? null,
      items,
      itemCount,
      subtotal,
      vendorGroups,
    },
  };
}

const addToCartSchema = z.object({
  variantId: z.string(),
  quantity: z.number().int().nonnegative().default(1),
  sessionId: z.string().optional(),
});

export async function addToCart(input: { variantId: string; quantity?: number; sessionId?: string }) {
  const parsed = addToCartSchema.parse(input);
  const quantityNum = Math.max(1, Math.floor(parsed.quantity || 1));
  const resolvedUserId = await resolveCartIdentifier();

  const ip = "cart:add";
  const limited = rateLimit(ip, { limit: 30, windowMs: 60 * 1000 });
  if (!limited.success) {
    return { error: "Too many requests", status: 429 };
  }

  const variant = await prisma.productVariant.findUnique({
    where: { id: parsed.variantId },
    include: {
      product: {
        select: { id: true, title: true, isPublished: true, vendorId: true, basePrice: true },
      },
    },
  });
  if (!variant || !variant.product.isPublished || !variant.isActive) {
    return { error: "Variant unavailable", status: 400 };
  }
  if (variant.stock < quantityNum) {
    return { error: `Only ${variant.stock} in stock`, status: 400 };
  }

  const { cart } = await getOrCreateCart(resolvedUserId, parsed.sessionId ?? null);
  if (!cart) {
    return { error: "Unable to create cart", status: 500 };
  }

  const existingItem = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, variantId: parsed.variantId },
  });

  if (existingItem) {
    const newQty = existingItem.quantity + quantityNum;
    if (variant.stock < newQty) {
      return { error: `Only ${variant.stock} in stock`, status: 400 };
    }
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: newQty },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, variantId: (parsed.variantId ?? null) as string | null, quantity: quantityNum } as any,
    });
  }

  revalidatePath("/cart");
  return { ok: true };
}

const updateCartItemSchema = z.object({
  cartItemId: z.string(),
  quantity: z.number().int().nonnegative(),
});

export async function updateCartItem(input: { cartItemId: string; quantity: number }) {
  const parsed = updateCartItemSchema.parse(input);
  const quantityNum = Math.max(0, Math.floor(parsed.quantity));
  const resolvedUserId = await resolveCartIdentifier();

  const item = await prisma.cartItem.findUnique({
    where: { id: parsed.cartItemId },
    include: { cart: true, variant: true },
  });
  if (!item) return { error: "Item not found", status: 404 };

  // Ownership check
  if (resolvedUserId && item.cart.userId !== resolvedUserId) {
    return { error: "Forbidden", status: 403 };
  }
  if (!resolvedUserId && item.cart.sessionId && item.cart.userId) {
    return { error: "Forbidden", status: 403 };
  }

    const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId ?? "" } });
  if (variant && variant.stock < quantityNum) {
    return { error: `Only ${variant.stock} in stock`, status: 400 };
  }

  if (quantityNum === 0) {
    await prisma.cartItem.delete({ where: { id: parsed.cartItemId } });
  } else {
    await prisma.cartItem.update({ where: { id: parsed.cartItemId }, data: { quantity: quantityNum } });
  }

  revalidatePath("/cart");
  return { ok: true };
}

export async function removeCartItem(input: { cartItemId: string }) {
  const resolvedUserId = await resolveCartIdentifier();

  const item = await prisma.cartItem.findUnique({
    where: { id: input.cartItemId },
    include: { cart: true },
  });
  if (!item) return { error: "Item not found", status: 404 };

  if (resolvedUserId && item.cart.userId !== resolvedUserId) {
    return { error: "Forbidden", status: 403 };
  }
  if (!resolvedUserId && item.cart.sessionId && item.cart.userId) {
    return { error: "Forbidden", status: 403 };
  }

  await prisma.cartItem.delete({ where: { id: input.cartItemId } });
  revalidatePath("/cart");
  return { ok: true };
}

export async function clearCart(input: { sessionId?: string }) {
  const resolvedUserId = await resolveCartIdentifier();

  if (resolvedUserId) {
    await prisma.cart.deleteMany({ where: { userId: resolvedUserId } });
  } else if (input.sessionId) {
    await prisma.cart.deleteMany({ where: { sessionId: input.sessionId } });
  }
  revalidatePath("/cart");
  return { ok: true };
}

export async function mergeGuestCart(input: { sessionId: string }) {
  const resolvedUserId = await resolveCartIdentifier();
  if (!resolvedUserId || !input.sessionId) return { ok: true };

  const guestCart = await prisma.cart.findFirst({
    where: { sessionId: input.sessionId, userId: null },
    include: { items: true },
  });
  if (!guestCart) return { ok: true };

  const userCart = await prisma.cart.findFirst({ where: { userId: resolvedUserId } });
  const target = userCart ?? (await prisma.cart.create({ data: { userId: resolvedUserId } }));

  for (const item of guestCart.items) {
    const existing = await prisma.cartItem.findFirst({
      where: { cartId: target.id, variantId: item.variantId },
    });
  const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId ?? "" } });
    const qty = variant ? Math.min(item.quantity, variant.stock) : 0;
    if (qty <= 0) continue;
    if (existing) {
      const newQty = Math.min(existing.quantity + qty, variant?.stock ?? 0);
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty } });
    } else {
      await prisma.cartItem.create({
        data: { cartId: target.id, variantId: (item.variantId ?? null) as string | null, quantity: qty } as any,
      });
    }
  }

  await prisma.cartItem.deleteMany({ where: { cartId: guestCart.id } });
  await prisma.cart.delete({ where: { id: guestCart.id } });
  revalidatePath("/cart");
  return { ok: true };
}
