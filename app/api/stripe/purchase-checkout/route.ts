import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/access";
import { errorStatus } from "@/lib/errors";
import { PLATFORM_COMMISSION_RATE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { isPrismaUnknownFieldError } from "@/lib/prisma-compat";

const prismaAny = prisma as any;

const schema = z.object({
  itemIds: z.array(z.string().min(1)).min(1).max(20),
  source: z.enum(["item", "cart"]).default("cart"),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const purchaseDelegate = (prisma as typeof prisma & {
      purchase?: {
        findMany: (...args: unknown[]) => Promise<Array<{ itemId: string }>>;
      };
    }).purchase;
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured. Add STRIPE_SECRET_KEY." },
        { status: 500 },
      );
    }

    const { itemIds, source } = schema.parse(await request.json());
    const uniqueItemIds = [...new Set(itemIds)];

    let items: any[];
    try {
      items = await prismaAny.item.findMany({
        where: {
          id: { in: uniqueItemIds },
          featured: true,
          isAvailable: true,
          sellingPrice: { not: null },
        },
        include: {
          owner: { select: { id: true } },
        },
      });
    } catch (error) {
      if (!isPrismaUnknownFieldError(error)) throw error;
      items = await prismaAny.item.findMany({
        where: {
          id: { in: uniqueItemIds },
          featured: true,
          sellingPrice: { not: null },
        },
        include: {
          owner: { select: { id: true } },
        },
      });
    }

    if (items.length !== uniqueItemIds.length) {
      return NextResponse.json(
        { error: "One or more items are no longer available for purchase." },
        { status: 409 },
      );
    }

    if (items.some((item: any) => item.owner.id === user.id)) {
      return NextResponse.json(
        { error: "You cannot purchase your own listing." },
        { status: 400 },
      );
    }

    const soldItemIds = purchaseDelegate
      ? new Set((await purchaseDelegate.findMany({
          where: { itemId: { in: uniqueItemIds } },
          select: { itemId: true },
        })).map((entry: any) => entry.itemId))
      : new Set<string>();

    if (items.some((item: any) => soldItemIds.has(item.id))) {
      return NextResponse.json(
        { error: "One or more items have already been sold." },
        { status: 409 },
      );
    }

    const totalAmount = items.reduce((sum: number, item: any) => sum + (item.sellingPrice ?? 0), 0);
    const totalCommission = items.reduce(
      (sum: number, item: any) => sum + Math.round((item.sellingPrice ?? 0) * PLATFORM_COMMISSION_RATE),
      0,
    );
    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/dashboard/user?purchase=success`,
      cancel_url: source === "item" && items.length === 1 ? `${origin}/item/${items[0].id}?canceled=1` : `${origin}/cart?canceled=1`,
      metadata: {
        checkoutType: "purchase",
        source,
        buyerId: user.id,
        itemIds: JSON.stringify(items.map((item: any) => item.id)),
        totalAmount: String(totalAmount),
        totalCommission: String(totalCommission),
      },
      line_items: items.map((item: any) => ({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: item.sellingPrice ?? 0,
          product_data: {
            name: `${item.brand} ${item.title}`,
            description: "Buy-now purchase",
          },
        },
      })),
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Purchase checkout failed";
    const status = msg === "Unauthorized" ? 401 : errorStatus(error, 400);
    return NextResponse.json({ error: msg }, { status });
  }
}
