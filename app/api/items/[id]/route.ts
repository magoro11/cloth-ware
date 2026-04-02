import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/access";
import { errorStatus } from "@/lib/errors";
import { isPrismaUnknownFieldError } from "@/lib/prisma-compat";

const prismaAny = prisma as any;

const updateSchema = z.object({
  brand: z.string().min(2).max(80).optional(),
  category: z.string().min(2).max(50).optional(),
  size: z.string().min(1).max(20).optional(),
  condition: z.string().optional(),
  title: z.string().min(3).max(120).optional(),
  description: z.string().min(20).max(2000).optional(),
  rentalPricePerDay: z.number().int().positive().optional(),
  sellingPrice: z.number().int().positive().nullable().optional(),
  securityDeposit: z.number().int().positive().optional(),
  featured: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  location: z.string().max(120).nullable().optional(),
  occasion: z.string().max(80).nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireUser().catch(() => null);

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        owner: { select: { id: true, name: true, image: true } },
        availabilityBlocks: true,
        bookings: {
          where: { status: { in: ["PENDING", "CONFIRMED", "ACTIVE", "LATE"] } },
          select: { id: true, startDate: true, endDate: true, status: true },
        },
        repairs: { orderBy: { createdAt: "desc" } },
        reviews: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const canViewUnapproved = user && (item.ownerId === user.id || user.role === "ADMIN");
    if (!item.featured && !canViewUnapproved) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch item" },
      { status: errorStatus(error, 500) },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireRole(["LENDER", "ADMIN"]);
    const { id } = await params;
    const payload = updateSchema.parse(await request.json());

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        bookings: {
          where: { status: { in: ["PENDING", "CONFIRMED", "ACTIVE", "LATE"] } },
          select: { id: true },
        },
      },
    });

    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    if (item.ownerId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (item.bookings.length > 0) {
      return NextResponse.json(
        { error: "Seller cannot edit listing once booked" },
        { status: 409 },
      );
    }

    let updated;
    try {
      updated = await prismaAny.item.update({
        where: { id: item.id },
        data: {
          ...payload,
          featured: user.role === "ADMIN" ? payload.featured : undefined,
        },
      });
    } catch (error) {
      if (!isPrismaUnknownFieldError(error)) throw error;
      const { isAvailable: _ignoredAvailability, location: _ignoredLocation, occasion: _ignoredOccasion, ...legacyPayload } = payload;
      updated = await prismaAny.item.update({
        where: { id: item.id },
        data: {
          ...legacyPayload,
          featured: user.role === "ADMIN" ? payload.featured : undefined,
        },
      });
    }

    return NextResponse.json({ item: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update item";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireRole(["LENDER", "ADMIN"]);
    const { id } = await params;

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        bookings: {
          where: { status: { in: ["PENDING", "CONFIRMED", "ACTIVE", "LATE"] } },
          select: { id: true },
        },
      },
    });

    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    if (item.ownerId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (item.bookings.length > 0) {
      return NextResponse.json(
        { error: "Seller cannot edit listing once booked" },
        { status: 409 },
      );
    }

    await prisma.item.delete({ where: { id: item.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete item";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
