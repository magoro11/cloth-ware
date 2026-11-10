"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser, requireRole, AuthError } from "@/lib/access";
import { prisma } from "@/lib/prisma";

const listProductsSchema = z.object({
  category: z.string().optional(),
  brand: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.number().int().nonnegative().optional(),
  maxPrice: z.number().int().nonnegative().optional(),
  condition: z.enum(["NEW", "REFURBISHED", "USED"]).optional(),
  isOfficial: z.boolean().optional(),
  sort: z.enum(["popularity", "newest", "price_asc", "price_desc", "rating"]).default("newest"),
  page: z.number().int().nonnegative().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type ListProductsInput = z.infer<typeof listProductsSchema>;

export type ProductSummary = {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  shortDescription: string | null;
  basePrice: number;
  condition: string;
  isOfficial: boolean;
  vendorName: string | null;
  vendorRating: number | null;
  images: { url: string }[];
  variants: { id: string; sku: string; size: string | null; color: string | null; storage: string | null; price: number | null; stock: number }[];
  minPrice: number;
  reviewCount: number;
  averageRating: number | null;
};

export async function listProducts(input: ListProductsInput) {
  const parsed = listProductsSchema.parse(input);

  const where: Prisma.ProductWhereInput = {
    isPublished: true,
  };

  if (parsed.category) {
    where.category = { slug: parsed.category };
  }

  if (parsed.brand) {
    where.brand = { slug: parsed.brand };
  }

  if (parsed.condition) {
    where.condition = parsed.condition;
  }

  if (parsed.isOfficial !== undefined) {
    where.isOfficial = parsed.isOfficial;
  }

  if (parsed.minPrice !== undefined || parsed.maxPrice !== undefined) {
    where.basePrice = {};
    if (parsed.minPrice !== undefined) where.basePrice.gte = parsed.minPrice;
    if (parsed.maxPrice !== undefined) where.basePrice.lte = parsed.maxPrice;
  }

  if (parsed.search) {
    where.OR = [
      { title: { contains: parsed.search, mode: "insensitive" } },
      { brand: { name: { contains: parsed.search, mode: "insensitive" } } },
      { shortDescription: { contains: parsed.search, mode: "insensitive" } },
      { description: { contains: parsed.search, mode: "insensitive" } },
    ];
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
  switch (parsed.sort) {
    case "price_asc":
      orderBy = { basePrice: "asc" };
      break;
    case "price_desc":
      orderBy = { basePrice: "desc" };
      break;
    case "popularity":
      orderBy = { reviews: { _count: "desc" } };
      break;
    case "rating":
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
        vendor: { select: { businessName: true, rating: true } },
        brand: { select: { name: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 4 },
        variants: { where: { isActive: true }, take: 5 },
        _count: { select: { reviews: true } },
        reviews: { select: { rating: true }, take: 5, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / parsed.pageSize));

  const summaries: ProductSummary[] = products.map((p) => {
    const variantPrices = p.variants
      .filter((v) => v.price !== null)
      .map((v) => v.price!);
    const minPrice =
      variantPrices.length > 0
        ? Math.min(...variantPrices)
        : p.basePrice;
    const avgRating =
      p.reviews.length > 0
        ? p.reviews.reduce((acc, r) => acc + r.rating, 0) / p.reviews.length
        : null;

    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      brand: p.brand ? p.brand.name : null,
      shortDescription: p.shortDescription,
      basePrice: p.basePrice,
      condition: p.condition,
      isOfficial: p.isOfficial,
      vendorName: p.vendor?.businessName ?? null,
      vendorRating: p.vendor?.rating ? Number(p.vendor.rating) : null,
      images: p.images,
      variants: p.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        size: v.size,
        color: v.color,
        storage: v.storage,
        price: v.price,
        stock: v.stock,
      })),
      minPrice,
      reviewCount: p._count.reviews,
      averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
    };
  });

  return { products: summaries, total, pages, page: parsed.page, pageSize: parsed.pageSize };
}

const getProductSchema = z.object({
  slug: z.string().min(1),
});

export type ProductDetail = {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  shortDescription: string | null;
  description: string;
  basePrice: number;
  condition: string;
  isPublished: boolean;
  isOfficial: boolean;
  weightG: number | null;
  dimensionsCm: string | null;
  vendor: {
    id: string;
    businessName: string;
    businessEmail: string | null;
    businessPhone: string | null;
    county: string | null;
    town: string | null;
    verificationStatus: string;
    rating: number | null;
    totalReviews: number;
    isActive: boolean;
  };
  category: { id: string; name: string; slug: string } | null;
  brandInfo: { id: string; name: string; slug: string } | null;
  images: { id: string; url: string; sortOrder: number; isPrimary: boolean }[];
  variants: {
    id: string;
    sku: string;
    size: string | null;
    color: string | null;
    storage: string | null;
    price: number | null;
    stock: number;
    isActive: boolean;
  }[];
  reviews: {
    id: string;
    rating: number;
    title: string | null;
    comment: string | null;
    photos: string[];
    isVerifiedPurchase: boolean;
    createdAt: Date;
    user: { name: string | null; image: string | null };
  }[];
  reviewCount: number;
  averageRating: number | null;
};

export async function getProduct(input: { slug: string }) {
  const parsed = getProductSchema.parse(input);

  const product = await prisma.product.findUnique({
    where: { slug: parsed.slug, isPublished: true },
    include: {
      vendor: {
        select: {
          id: true,
          businessName: true,
          businessEmail: true,
          businessPhone: true,
          county: true,
          town: true,
          verificationStatus: true,
          rating: true,
          totalReviews: true,
          isActive: true,
        },
      },
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: { price: "asc" } },
      reviews: {
        where: { isApproved: true },
        select: {
          id: true,
          rating: true,
          title: true,
          comment: true,
          photos: true,
          isVerifiedPurchase: true,
          createdAt: true,
          user: { select: { name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { reviews: true } },
    },
  });

  if (!product) {
    throw new AuthError("Product not found", 404);
  }

  const avgRating =
    product.reviews.length > 0
      ? product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length
      : null;

  return {
    product: {
      id: product.id,
      slug: product.slug,
      title: product.title,
      brand: product.brand ? product.brand.name : null,
      shortDescription: product.shortDescription,
      description: product.description,
      basePrice: product.basePrice,
      condition: product.condition,
      isPublished: product.isPublished,
      isOfficial: product.isOfficial,
      weightG: product.weightG,
      dimensionsCm: product.dimensionsCm,
      vendor: {
        id: product.vendor.id,
        businessName: product.vendor.businessName,
        businessEmail: product.vendor.businessEmail,
        businessPhone: product.vendor.businessPhone,
        county: product.vendor.county,
        town: product.vendor.town,
        verificationStatus: product.vendor.verificationStatus,
        rating: product.vendor.rating ? Number(product.vendor.rating) : null,
        totalReviews: product.vendor.totalReviews,
        isActive: product.vendor.isActive,
      },
      category: product.category,
      brandInfo: product.brand,
      images: product.images,
      variants: product.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        size: v.size,
        color: v.color,
        storage: v.storage,
        price: v.price,
        stock: v.stock,
        isActive: v.isActive,
      })),
      reviews: product.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        photos: r.photos,
        isVerifiedPurchase: r.isVerifiedPurchase,
        createdAt: r.createdAt,
        user: r.user,
      })),
      reviewCount: product._count.reviews,
      averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
    },
  };
}

const getCategoriesSchema = z.object({
  parent: z.string().optional(),
});

export type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  productCount: number;
};

export async function getCategories(input: { parent?: string } = {}) {
  const parsed = getCategoriesSchema.parse(input);

  const categories = await prisma.category.findMany({
    where: { isActive: true, parentId: parsed.parent ?? undefined },
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: "asc" },
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    imageUrl: c.imageUrl,
    productCount: c._count.products,
  }));
}

const getBrandsSchema = z.object({
  search: z.string().optional(),
});

export type BrandItem = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  productCount: number;
};

export async function getBrands(input: { search?: string } = {}) {
  const parsed = getBrandsSchema.parse(input);

  const where: Prisma.BrandWhereInput = { isActive: true };
  if (parsed.search) {
    where.name = { contains: parsed.search, mode: "insensitive" };
  }

  const brands = await prisma.brand.findMany({
    where,
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return brands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    logoUrl: b.logoUrl,
    productCount: b._count.products,
  }));
}

const getFilterOptionsSchema = z.object({
  category: z.string().optional(),
  brand: z.string().optional(),
});

export type FilterOptions = {
  categories: CategoryItem[];
  brands: BrandItem[];
  priceRange: { min: number; max: number };
  conditions: { value: string; label: string }[];
};

export async function getFilterOptions(input: { category?: string; brand?: string } = {}) {
  const parsed = getFilterOptionsSchema.parse(input);

  const where: Prisma.ProductWhereInput = { isPublished: true };
  if (parsed.category) where.category = { slug: parsed.category };
  if (parsed.brand) where.brand = { slug: parsed.brand };

  const [categories, brands, priceStats] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: { where } } } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: { where } } } },
      orderBy: { name: "asc" },
    }),
    prisma.product.aggregate({
      where,
      _min: { basePrice: true },
      _max: { basePrice: true },
    }),
  ]);

  return {
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      imageUrl: c.imageUrl,
      productCount: c._count.products,
    })),
    brands: brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      logoUrl: b.logoUrl,
      productCount: b._count.products,
    })),
    priceRange: {
      min: priceStats._min.basePrice ?? 0,
      max: priceStats._max.basePrice ?? 0,
    },
    conditions: [
      { value: "NEW", label: "New" },
      { value: "REFURBISHED", label: "Refurbished" },
      { value: "USED", label: "Used" },
    ],
  };
}
