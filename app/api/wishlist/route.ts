import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/access";
import { errorStatus } from "@/backend/lib/errors";

const schema = z.object({
  productId: z.string().min(2),
});

export async function GET() {
  try {
    const user = await requireUser();
    const wishlist = await prisma.wishlistItem.findMany({
      where: { userId: user.id },
      select: { productId: true },
    });
    return NextResponse.json({ productIds: wishlist.map((entry) => entry.productId) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ productIds: [] });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const payload = schema.parse(await request.json());

    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId: user.id, productId: payload.productId } },
    });

    if (existing) {
      await prisma.wishlistItem.delete({ where: { id: existing.id } });
      return NextResponse.json({ wishlisted: false });
    }

    await prisma.wishlistItem.create({ data: { userId: user.id, productId: payload.productId } });
    return NextResponse.json({ wishlisted: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unable to update wishlist";
    return NextResponse.json({ error: message }, { status: errorStatus(error, 400) });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const payload = schema.parse(await request.json());

    await prisma.wishlistItem.deleteMany({
      where: { userId: user.id, productId: payload.productId },
    });

    return NextResponse.json({ wishlisted: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unable to remove from wishlist";
    return NextResponse.json({ error: message }, { status: errorStatus(error, 400) });
  }
}
