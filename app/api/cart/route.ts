import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/access";
import { errorStatus, isDatabaseUnavailable } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  itemId: z.string().min(1),
});

export async function GET() {
  try {
    const user = await requireUser();
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: user.id },
      include: {
        item: {
          include: {
            images: { orderBy: { sortOrder: "asc" } },
            owner: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      count: cartItems.length,
      items: cartItems,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load cart";
    return NextResponse.json(
      { error: isDatabaseUnavailable(error) ? "Cart tables are not in the database yet. Run npm run db:push." : message },
      { status: message === "Unauthorized" ? 401 : errorStatus(error, 400) },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { itemId } = schema.parse(await request.json());

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { id: true, ownerId: true, featured: true, sellingPrice: true, title: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (!item.featured) {
      return NextResponse.json({ error: "Listing is not available yet" }, { status: 409 });
    }

    if (!item.sellingPrice) {
      return NextResponse.json({ error: "This listing is only available for rental" }, { status: 409 });
    }

    if (item.ownerId === user.id) {
      return NextResponse.json({ error: "You cannot add your own item to cart" }, { status: 400 });
    }

    const cartItem = await prisma.cartItem.upsert({
      where: {
        userId_itemId: {
          userId: user.id,
          itemId: item.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        itemId: item.id,
      },
      include: {
        item: {
          include: {
            images: { orderBy: { sortOrder: "asc" } },
            owner: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });

    const count = await prisma.cartItem.count({ where: { userId: user.id } });

    return NextResponse.json({ cartItem, count }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add item to cart";
    return NextResponse.json(
      { error: isDatabaseUnavailable(error) ? "Cart tables are not in the database yet. Run npm run db:push." : message },
      { status: message === "Unauthorized" ? 401 : errorStatus(error, 400) },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const { itemId } = schema.parse(await request.json());

    await prisma.cartItem.deleteMany({
      where: {
        userId: user.id,
        itemId,
      },
    });

    const count = await prisma.cartItem.count({ where: { userId: user.id } });

    return NextResponse.json({ success: true, count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove item from cart";
    return NextResponse.json(
      { error: isDatabaseUnavailable(error) ? "Cart tables are not in the database yet. Run npm run db:push." : message },
      { status: message === "Unauthorized" ? 401 : errorStatus(error, 400) },
    );
  }
}
