import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/access";

const schema = z.object({
  itemId: z.string().min(2),
});

export async function GET() {
  try {
    const user = await requireUser();
    const wishlist = await prisma.wishlist.findMany({
      where: { userId: user.id },
      select: { itemId: true },
    });
    return NextResponse.json({ itemIds: wishlist.map((entry) => entry.itemId) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ itemIds: [] });
  }
}

/** Toggle: adds if absent, removes if present. Used by the heart button. */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const payload = schema.parse(await request.json());

    const existing = await prisma.wishlist.findUnique({
      where: { userId_itemId: { userId: user.id, itemId: payload.itemId } },
    });

    if (existing) {
      await prisma.wishlist.delete({ where: { id: existing.id } });
      return NextResponse.json({ wishlisted: false });
    }

    await prisma.wishlist.create({ data: { userId: user.id, itemId: payload.itemId } });
    return NextResponse.json({ wishlisted: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unable to update wishlist";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Explicit DELETE — always removes without toggling. */
export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const payload = schema.parse(await request.json());

    await prisma.wishlist.deleteMany({
      where: { userId: user.id, itemId: payload.itemId },
    });

    return NextResponse.json({ wishlisted: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unable to remove from wishlist";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
