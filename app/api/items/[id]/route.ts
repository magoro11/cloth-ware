import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/access";
import { errorStatus } from "@/lib/errors";

const updateSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().min(20).max(2000).optional(),
  rentalPricePerDay: z.number().int().positive().optional(),
  sellingPrice: z.number().int().positive().nullable().optional(),
  securityDeposit: z.number().int().positive().optional(),
  featured: z.boolean().optional(),
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

    const updated = await prisma.item.update({
      where: { id: item.id },
      data: {
        ...payload,
        featured: user.role === "ADMIN" ? payload.featured : undefined,
      },
    });

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
