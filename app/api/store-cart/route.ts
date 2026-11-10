import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, AuthError } from "@/lib/access";
import { errorStatus, isDatabaseUnavailable } from "@/backend/lib/errors";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
});

export async function GET() {
  try {
    const user = await requireUser();
    let cart: any = await prisma.storeCart.findFirst({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: { orderBy: { sortOrder: "asc" }, take: 1 },
                    seller: { select: { name: true, id: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.storeCart.create({ data: { userId: user.id }, include: { items: true } });
    }

    return NextResponse.json({
      count: cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
      items: cart.items,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unable to load cart";
    return NextResponse.json(
      { error: isDatabaseUnavailable(error) ? "Cart tables are not in the database yet. Run npm run db:push." : message },
      { status: errorStatus(error, 400) },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { variantId, quantity } = schema.parse(await request.json());

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: { select: { id: true, sellerId: true, isPublished: true, title: true } } },
    });

    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    if (!variant.product.isPublished) {
      return NextResponse.json({ error: "Product is not available" }, { status: 409 });
    }

    if (!variant.isActive) {
      return NextResponse.json({ error: "This variant is not active" }, { status: 409 });
    }

    if (variant.stock < quantity) {
      return NextResponse.json({ error: `Only ${variant.stock} items available` }, { status: 409 });
    }

    if (variant.product.sellerId === user.id) {
      return NextResponse.json({ error: "You cannot add your own product to cart" }, { status: 400 });
    }

    let cart = await prisma.storeCart.findFirst({ where: { userId: user.id } });
    if (!cart) {
      cart = await prisma.storeCart.create({ data: { userId: user.id } });
    }

    const cartItem = await prisma.storeCartItem.upsert({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId,
        },
      },
      update: { quantity: { increment: quantity } },
      create: {
        cartId: cart.id,
        variantId,
        quantity,
      },
      include: {
        variant: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: "asc" }, take: 1 },
                seller: { select: { name: true, id: true } },
              },
            },
          },
        },
      },
    });

    const count = await prisma.storeCartItem.aggregate({
      where: { cartId: cart.id },
      _sum: { quantity: true },
    });

    return NextResponse.json({ cartItem, count: count._sum.quantity || 0 }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unable to add item to cart";
    return NextResponse.json(
      { error: isDatabaseUnavailable(error) ? "Cart tables are not in the database yet. Run npm run db:push." : message },
      { status: errorStatus(error, 400) },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const { variantId, quantity } = schema.parse(await request.json());

    const cart = await prisma.storeCart.findFirst({ where: { userId: user.id } });
    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    if (quantity <= 0) {
      await prisma.storeCartItem.deleteMany({
        where: { cartId: cart.id, variantId },
      });
    } else {
      const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
      if (!variant || variant.stock < quantity) {
        return NextResponse.json({ error: "Insufficient stock" }, { status: 409 });
      }

      await prisma.storeCartItem.update({
        where: { cartId_variantId: { cartId: cart.id, variantId } },
        data: { quantity },
      });
    }

    const count = await prisma.storeCartItem.aggregate({
      where: { cartId: cart.id },
      _sum: { quantity: true },
    });

    return NextResponse.json({ success: true, count: count._sum.quantity || 0 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unable to update cart";
    return NextResponse.json({ error: message }, { status: errorStatus(error, 400) });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const { variantId } = schema.parse(await request.json());

    const cart = await prisma.storeCart.findFirst({ where: { userId: user.id } });
    if (!cart) {
      return NextResponse.json({ success: true, count: 0 });
    }

    await prisma.storeCartItem.deleteMany({
      where: { cartId: cart.id, variantId },
    });

    const count = await prisma.storeCartItem.aggregate({
      where: { cartId: cart.id },
      _sum: { quantity: true },
    });

    return NextResponse.json({ success: true, count: count._sum.quantity || 0 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unable to remove item from cart";
    return NextResponse.json({ error: message }, { status: errorStatus(error, 400) });
  }
}