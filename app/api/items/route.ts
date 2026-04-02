import { NextResponse } from "next/server";
import { z } from "zod";
import { ItemCondition } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/access";
import { errorStatus } from "@/lib/errors";
import { isPrismaUnknownFieldError } from "@/lib/prisma-compat";

const prismaAny = prisma as any;

const createItemSchema = z.object({
  title: z.string().min(3).max(120),
  brand: z.string().min(2).max(80),
  description: z.string().min(20).max(2000),
  category: z.string().min(2).max(50),
  size: z.string().min(1).max(20),
  condition: z.nativeEnum(ItemCondition),
  rentalPricePerDay: z.number().int().positive(),
  sellingPrice: z.number().int().positive().nullable(),
  securityDeposit: z.number().int().positive(),
  location: z.string().max(120).optional().nullable(),
  occasion: z.string().max(80).optional().nullable(),
  images: z.array(z.string().url()).min(1).max(8),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const size = searchParams.get("size") || undefined;
    const maxDaily = searchParams.get("maxDaily")
      ? Number(searchParams.get("maxDaily"))
      : undefined;
    const q = searchParams.get("q") || undefined;

    const items = await prisma.item.findMany({
      where: {
        featured: true,
        category,
        size,
        rentalPricePerDay: maxDaily ? { lte: maxDaily } : undefined,
        OR: q
          ? [
              { title: { contains: q, mode: "insensitive" } },
              { brand: { contains: q, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        owner: { select: { id: true, name: true, image: true } },
        reviews: true,
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    });

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch items" },
      { status: errorStatus(error, 500) },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(["LENDER", "ADMIN"]);
    const body = createItemSchema.parse(await request.json());

    let item;
    try {
      item = await prismaAny.item.create({
        data: {
          ownerId: user.id,
          title: body.title,
          brand: body.brand,
          description: body.description,
          category: body.category,
          size: body.size,
          condition: body.condition,
          rentalPricePerDay: body.rentalPricePerDay,
          sellingPrice: body.sellingPrice ?? undefined,
          securityDeposit: body.securityDeposit,
          location: body.location || undefined,
          occasion: body.occasion || undefined,
          featured: user.role === "ADMIN",
          isAvailable: true,
          images: {
            createMany: {
              data: body.images.map((url, idx) => ({ url, sortOrder: idx })),
            },
          },
        },
        include: { images: true },
      });
    } catch (error) {
      if (!isPrismaUnknownFieldError(error)) throw error;
      item = await prismaAny.item.create({
        data: {
          ownerId: user.id,
          title: body.title,
          brand: body.brand,
          description: body.description,
          category: body.category,
          size: body.size,
          condition: body.condition,
          rentalPricePerDay: body.rentalPricePerDay,
          sellingPrice: body.sellingPrice ?? undefined,
          securityDeposit: body.securityDeposit,
          featured: user.role === "ADMIN",
          images: {
            createMany: {
              data: body.images.map((url, idx) => ({ url, sortOrder: idx })),
            },
          },
        },
        include: { images: true },
      });
    }
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      const fieldPath = firstIssue?.path?.join(".") || "payload";
      const fieldLabel = fieldPath.charAt(0).toUpperCase() + fieldPath.slice(1);
      const message = firstIssue ? `${fieldLabel}: ${firstIssue.message}` : "Invalid item data";
      return NextResponse.json(
        { error: message, issues: error.issues },
        { status: 400 },
      );
    }

    const msg = error instanceof Error ? error.message : "Unable to create item";
    const status =
      msg === "Unauthorized"
        ? 401
        : msg === "Forbidden"
          ? 403
          : errorStatus(error, 400);
    return NextResponse.json({ error: msg }, { status });
  }
}
