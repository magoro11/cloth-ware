import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access";
import { errorStatus } from "@/backend/lib/errors";

const schema = z.object({
  itemId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5).max(800),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const payload = schema.parse(await request.json());

    // Verify the user has a completed booking for this item
    const completedBooking = await prisma.booking.findFirst({
      where: {
        itemId: payload.itemId,
        customerId: user.id,
        status: "COMPLETED",
      },
      select: { id: true },
    });

    if (!completedBooking) {
      return NextResponse.json(
        { error: "You can only review items you have rented and returned." },
        { status: 403 },
      );
    }

    // Prevent duplicate reviews per user per item
    const existing = await prisma.review.findFirst({
      where: { itemId: payload.itemId, authorId: user.id },
      select: { id: true },
    });

    if (existing) {
      // Update existing review instead of creating a duplicate
      const updated = await prisma.review.update({
        where: { id: existing.id },
        data: { rating: payload.rating, comment: payload.comment },
      });
      return NextResponse.json({ review: updated });
    }

    const review = await prisma.review.create({
      data: {
        itemId: payload.itemId,
        authorId: user.id,
        rating: payload.rating,
        comment: payload.comment,
      },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid review data" },
        { status: 400 },
      );
    }
    const msg = error instanceof Error ? error.message : "Unable to submit review";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : errorStatus(error, 400) },
    );
  }
}
