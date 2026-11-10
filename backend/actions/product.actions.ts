"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser, requireRole, AuthError } from "@/lib/access";
import { prisma } from "@/lib/prisma";

const baseProductSchema = z.object({
  title: z.string().min(2).max(120),
  brand: z.string().min(1).max(80).optional().nullable(),
  description: z.string().min(10).max(4000),
  categoryId: z.string().cuid().optional().nullable(),
  basePrice: z.number().int().nonnegative(),
  isPublished: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  stockAlert: z.number().int().nonnegative().default(5),
});

const variantSchema = z.object({
  sku: z.string().min(2).max(64),
  size: z.string().min(1).max(20),
  color: z.string().min(1).max(40).optional().nullable(),
  price: z.number().int().nonnegative().optional().nullable(),
  stock: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});

async function requireSellerProductAccess(productId: string, userId: string) {
  const user = await requireUser();
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, sellerId: true },
  });
  if (!product) throw new AuthError("Not found", 404);
  if (user.role !== "ADMIN" && product.sellerId !== user.id) {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}

export async function createProduct(input: {
  title: string;
  brand?: string | null;
  description: string;
  categoryId?: string | null;
  basePrice: number;
  isPublished?: boolean;
  isFeatured?: boolean;
  stockAlert?: number;
}) {
  const user = await requireRole(["LENDER", "ADMIN"]);
  const parsed = baseProductSchema.parse(input);

  const product = await prisma.product.create({
    data: {
      sellerId: user.id,
      categoryId: parsed.categoryId ?? undefined,
      slug: parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80),
      title: parsed.title,
      brand: parsed.brand ?? null,
      description: parsed.description,
      basePrice: parsed.basePrice,
      isPublished: parsed.isPublished,
      isFeatured: user.role === "ADMIN" ? parsed.isFeatured : false,
      stockAlert: parsed.stockAlert,
    },
  });
  revalidatePath("/seller/products");
  revalidatePath("/admin/products");
  return { product };
}

export async function updateProduct(input: {
  id: string;
  title?: string;
  brand?: string | null;
  description?: string;
  categoryId?: string | null;
  basePrice?: number;
  isPublished?: boolean;
  isFeatured?: boolean;
  stockAlert?: number;
}) {
  const user = await requireUser();
  const parsed = baseProductSchema
    .partial()
    .refine((d) => d.title !== undefined || d.brand !== undefined || d.description !== undefined, {
      message: "Nothing to update",
    })
    .parse(input);

  await requireSellerProductAccess(input.id, user.id);

  const data: any = {};
  if (parsed.title !== undefined) {
    data.title = parsed.title;
    data.slug = parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80);
  }
  if (parsed.brand !== undefined) data.brand = parsed.brand;
  if (parsed.description !== undefined) data.description = parsed.description;
  if (parsed.categoryId !== undefined) data.categoryId = parsed.categoryId ?? undefined;
  if (parsed.basePrice !== undefined) data.basePrice = parsed.basePrice;
  if (parsed.isPublished !== undefined) data.isPublished = parsed.isPublished;
  if (parsed.isFeatured !== undefined && user.role === "ADMIN") data.isFeatured = parsed.isFeatured;
  if (parsed.stockAlert !== undefined) data.stockAlert = parsed.stockAlert;

  const product = await prisma.product.update({ where: { id: input.id }, data });
  revalidatePath("/seller/products");
  revalidatePath("/admin/products");
  return { product };
}

export async function deleteProduct(input: { id: string }) {
  const user = await requireUser();
  await requireSellerProductAccess(input.id, user.id);
  await prisma.product.delete({ where: { id: input.id } });
  revalidatePath("/seller/products");
  revalidatePath("/admin/products");
  return { ok: true };
}

export async function createVariant(input: {
  productId: string;
  sku: string;
  size: string;
  color?: string | null;
  price?: number | null;
  stock: number;
  isActive?: boolean;
}) {
  const user = await requireUser();
  const parsed = variantSchema.parse(input);
  await requireSellerProductAccess(input.productId, user.id);

  // SKU uniqueness across products enforced by DB; surface friendly error.
  try {
    const variant = await prisma.productVariant.create({
      data: {
        productId: input.productId,
        sku: parsed.sku,
        size: parsed.size,
        color: parsed.color ?? null,
        price: parsed.price ?? null,
        stock: parsed.stock,
        isActive: parsed.isActive,
      },
    });
    revalidatePath("/seller/products");
    return { variant };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unique constraint") || message.includes("P2002")) {
      return { error: "SKU already exists" };
    }
    throw error;
  }
}

export async function updateVariant(input: {
  id: string;
  productId: string;
  sku?: string;
  size?: string;
  color?: string | null;
  price?: number | null;
  stock?: number;
  isActive?: boolean;
}) {
  const user = await requireUser();
  await requireSellerProductAccess(input.productId, user.id);
  const parsed = variantSchema.partial().parse(input);

  const data: any = {};
  if (parsed.sku !== undefined) data.sku = parsed.sku;
  if (parsed.size !== undefined) data.size = parsed.size;
  if (parsed.color !== undefined) data.color = parsed.color;
  if (parsed.price !== undefined) data.price = parsed.price;
  if (parsed.stock !== undefined) data.stock = parsed.stock;
  if (parsed.isActive !== undefined) data.isActive = parsed.isActive;

  const variant = await prisma.productVariant.update({ where: { id: input.id }, data });
  revalidatePath("/seller/products");
  return { variant };
}

export async function deleteVariant(input: { id: string; productId: string }) {
  const user = await requireUser();
  await requireSellerProductAccess(input.productId, user.id);
  await prisma.productVariant.delete({ where: { id: input.id } });
  revalidatePath("/seller/products");
  return { ok: true };
}

export async function setProductImages(input: { productId: string; imageUrls: { url: string; sortOrder: number }[] }) {
  const user = await requireUser();
  await requireSellerProductAccess(input.productId, user.id);

  await prisma.productImage.deleteMany({ where: { productId: input.productId } });
  await prisma.productImage.createMany({
    data: input.imageUrls.map((u) => ({ productId: input.productId, url: u.url, sortOrder: u.sortOrder })),
  });
  revalidatePath("/seller/products");
  return { ok: true };
}
