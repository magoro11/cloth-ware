import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: true,
      images: { orderBy: { sortOrder: "asc" } },
      vendor: { select: { businessName: true, businessEmail: true, id: true } },
      reviews: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Check access for non-published products
  if (!product.isPublished && session?.user?.id !== product.vendorId && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ product });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: true, images: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.vendorId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, brand, description, categoryId, basePrice, isPublished, isFeatured, images, variants } = body;

    // Update product
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Update product fields
      const product = await tx.product.update({
        where: { id },
        data: {
          title: title ?? undefined,
          brand: brand ?? undefined,
          description: description ?? undefined,
          categoryId: categoryId ?? undefined,
          basePrice: basePrice ? Number(basePrice) : undefined,
          isPublished: isPublished ?? undefined,
          isFeatured: isFeatured ?? undefined,
        },
      });

      // Update images if provided
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({
          data: images.map((url: string, index: number) => ({
            productId: id,
            url,
            sortOrder: index,
          })),
        });
      }

      // Update variants if provided
      if (variants) {
        // Delete variants not in the new list
        const newVariantIds = variants.filter((v: any) => v.id).map((v: any) => v.id);
        await tx.productVariant.deleteMany({
          where: {
            productId: id,
            NOT: { id: { in: newVariantIds } },
          },
        });

        // Upsert variants
        for (const variant of variants) {
          if (variant.id) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                sku: variant.sku,
                size: variant.size,
                color: variant.color || null,
                price: variant.price ? Number(variant.price) : null,
                stock: Number(variant.stock) || 0,
                isActive: variant.isActive !== false,
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                productId: id,
                sku: variant.sku,
                size: variant.size,
                color: variant.color || null,
                price: variant.price ? Number(variant.price) : null,
                stock: Number(variant.stock) || 0,
                isActive: variant.isActive !== false,
              },
            });
          }
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: { variants: true, images: { orderBy: { sortOrder: "asc" } }, category: true },
      });
    });

    return NextResponse.json({ product: updatedProduct });
  } catch (error) {
    console.error("Product update error:", error);
    return NextResponse.json({ error: "Unable to update product" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.vendorId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Product deletion error:", error);
    return NextResponse.json({ error: "Unable to delete product" }, { status: 500 });
  }
}