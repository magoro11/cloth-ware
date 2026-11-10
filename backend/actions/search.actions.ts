"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const searchProductsSchema = z.object({
  q: z.string().min(1).max(200),
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.number().int().nonnegative().optional(),
  maxPrice: z.number().int().nonnegative().optional(),
  sort: z.enum(["relevance", "newest", "price_asc", "price_desc"]).default("relevance"),
  page: z.number().int().nonnegative().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type SearchResult = {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  basePrice: number;
  minPrice: number;
  images: { url: string }[];
  vendorName: string | null;
  reviewCount: number;
  averageRating: number | null;
};

export async function searchProducts(input: {
  q: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "relevance" | "newest" | "price_asc" | "price_desc";
  page?: number;
  pageSize?: number;
}) {
  const parsed = searchProductsSchema.parse(input);

  const where: Prisma.ProductWhereInput = {
    isPublished: true,
  };

  if (parsed.category) {
    where.category = { slug: parsed.category };
  }

  if (parsed.brand) {
    where.brand = { slug: parsed.brand };
  }

  if (parsed.minPrice !== undefined || parsed.maxPrice !== undefined) {
    where.basePrice = {};
    if (parsed.minPrice !== undefined) where.basePrice.gte = parsed.minPrice;
    if (parsed.maxPrice !== undefined) where.basePrice.lte = parsed.maxPrice;
  }

  const searchTerm = parsed.q.trim();
  if (searchTerm) {
    where.OR = [
      { title: { contains: searchTerm, mode: "insensitive" } },
      { brand: { name: { contains: searchTerm, mode: "insensitive" } } },
      { shortDescription: { contains: searchTerm, mode: "insensitive" } },
      { description: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = {};
  switch (parsed.sort) {
    case "price_asc":
      orderBy = { basePrice: "asc" };
      break;
    case "price_desc":
      orderBy = { basePrice: "desc" };
      break;
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
    default:
      orderBy = { createdAt: "desc" };
  }

  const skip = (parsed.page - 1) * parsed.pageSize;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: parsed.pageSize,
      include: {
        vendor: { select: { businessName: true } },
        brand: { select: { name: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: { where: { isActive: true }, take: 3 },
        _count: { select: { reviews: true } },
        reviews: { select: { rating: true }, take: 3 },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / parsed.pageSize));

  const results: SearchResult[] = products.map((p) => {
    const variantPrices = p.variants.filter((v) => v.price !== null).map((v) => v.price!);
    const minPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : p.basePrice;
    const avgRating =
      p.reviews.length > 0
        ? p.reviews.reduce((acc, r) => acc + r.rating, 0) / p.reviews.length
        : null;

    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      brand: p.brand ? p.brand.name : null,
      basePrice: p.basePrice,
      minPrice,
      images: p.images,
      vendorName: p.vendor?.businessName ?? null,
      reviewCount: p._count.reviews,
      averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
    };
  });

  return { results, total, pages, page: parsed.page, pageSize: parsed.pageSize, query: parsed.q };
}

export async function getSearchSuggestions(q: string) {
  if (!q || q.trim().length < 2) return [];

  const term = q.trim();

  const [products, brands] = await Promise.all([
    prisma.product.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { brand: { name: { contains: term, mode: "insensitive" } } },
        ],
      },
      select: { id: true, title: true, brand: true, slug: true },
      take: 5,
    }),
    prisma.brand.findMany({
      where: {
        isActive: true,
        name: { contains: term, mode: "insensitive" },
      },
      select: { id: true, name: true, slug: true },
      take: 5,
    }),
  ]);

  return {
    products: products.map((p) => ({
      type: "product" as const,
      id: p.id,
      label: p.title,
      subtitle: p.brand ? p.brand.name : "",
      href: `/product/${p.slug}`,
    })),
    brands: brands.map((b) => ({
      type: "brand" as const,
      id: b.id,
      label: b.name,
      subtitle: "Brand",
      href: `/marketplace?brand=${b.slug}`,
    })),
  };
}
