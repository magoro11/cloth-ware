"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser, AuthError } from "@/lib/access";
import { prisma } from "@/lib/prisma";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional().nullable(),
});

export async function listProductReviews(input: { productId: string }) {
  const reviews = await prisma.review.findMany({
    where: { productId: input.productId },
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  });
  return { reviews };
}

export async function getMyReview(input: { productId: string }) {
  const user = await requireUser();
  const review = await prisma.review.findFirst({
    where: { productId: input.productId, userId: user.id },
  });
  return { review };
}

export async function upsertReview(input: { productId: string } & z.infer<typeof reviewSchema>) {
  const user = await requireUser();
  const parsed = reviewSchema.parse(input);

  // Only allow review if user has a paid order for this product (anti fake review)
  const hasPurchase = await prisma.orderItem.findFirst({
    where: {
      productId: input.productId,
      subOrder: {
        order: { userId: user.id, status: "DELIVERED" },
        status: "DELIVERED",
      },
    },
    select: { id: true },
  });
  if (!hasPurchase) {
    throw new AuthError("You can only review products you have purchased and received", 403);
  }

  const review = await prisma.review.findFirst({
    where: { userId: user.id, productId: input.productId },
  });
  if (review) {
    const updated = await prisma.review.update({
      where: { id: review.id },
      data: { rating: parsed.rating, comment: parsed.comment ?? "" },
    });
    revalidatePath("/store/placeholder");
    return { review: updated };
  }

  const created = await prisma.review.create({
    data: { userId: user.id, productId: input.productId, rating: parsed.rating, comment: parsed.comment ?? "" },
  });
  revalidatePath("/store/placeholder");
  return { review: created };
}
