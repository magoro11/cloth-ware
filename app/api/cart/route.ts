import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, AuthError } from "@/lib/access";
import { errorStatus } from "@/backend/lib/errors";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().optional().default(1),
  variantId: z.string().optional(),
});

const prismaAny = prisma as any;

export async function GET() {
  try {
    const user = await requireUser();
    const cart = await prisma.cart.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!cart) {
      return NextResponse.json({ count: 0, items: [] });
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        product: {
          include: {
            images: { orderBy: { sortOrder: "asc" } },
          },
        },
        variant: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      count: cartItems.length,
      items: cartItems.map((ci: any) => ({
        ...ci,
        item: ci.product,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unable to load cart";
    return NextResponse.json(
      { error: message },
      { status: errorStatus(error, 400) },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { productId, quantity, variantId } = schema.parse(await request.json());

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, vendorId: true, isPublished: true, basePrice: true, title: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (!product.isPublished) {
      return NextResponse.json({ error: "Listing is not available yet" }, { status: 409 });
    }

    if (product.vendorId === user.id) {
      return NextResponse.json({ error: "You cannot add your own product to cart" }, { status: 400 });
    }

    let cart = await prisma.cart.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: user.id },
        select: { id: true },
      });
    }

    const existing = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId: product.id },
    });

    let cartItem;
    if (existing) {
      cartItem = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: { increment: quantity } },
        include: {
          product: {
            include: {
              images: { orderBy: { sortOrder: "asc" } },
            },
          },
          variant: true,
        },
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          variantId: variantId ?? null,
          quantity,
        },
        include: {
          product: {
            include: {
              images: { orderBy: { sortOrder: "asc" } },
            },
          },
          variant: true,
        },
      });
    }

    const count = await prisma.cartItem.count({
      where: { cartId: cart.id },
    });

    return NextResponse.json({ cartItem, count }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unable to add item to cart";
    return NextResponse.json(
      { error: message },
      { status: errorStatus(error, 400) },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const { productId } = schema.parse(await request.json());

    const cart = await prisma.cart.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!cart) {
      return NextResponse.json({ success: true, count: 0 });
    }

    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId,
      },
    });

    const count = await prisma.cartItem.count({
      where: { cartId: cart.id },
    });

    return NextResponse.json({ success: true, count });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unable to remove item from cart";
    return NextResponse.json(
      { error: message },
      { status: errorStatus(error, 400) },
    );
  }
}
