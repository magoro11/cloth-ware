"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function listWishlist() {
  const user = await requireUser();
  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    include: {
      product: {
        include: {
          variants: { where: { isActive: true }, orderBy: { size: "asc" }, take: 5 },
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return { items };
}

export async function addToWishlist(input: { productId: string }) {
  const user = await requireUser();
  const product = await prisma.product.findUnique({ where: { id: input.productId }, select: { id: true, isPublished: true } });
  if (!product || !product.isPublished) return { error: "Product not found" };

  const item = await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId: user.id, productId: input.productId } },
    update: {},
    create: { userId: user.id, productId: input.productId },
  });
  revalidatePath("/account/wishlist");
  return { item };
}

export async function removeFromWishlist(input: { productId: string }) {
  const user = await requireUser();
  await prisma.wishlistItem.deleteMany({ where: { userId: user.id, productId: input.productId } });
  revalidatePath("/account/wishlist");
  return { ok: true };
}

export async function isWishlisted(input: { productId: string }) {
  const user = await requireUser();
  const item = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId: user.id, productId: input.productId } },
    select: { id: true },
  });
  return { wishlisted: !!item };
}
