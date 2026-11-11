import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const vendorId = searchParams.get("sellerId");
  const isPublished = searchParams.get("isPublished");
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "20");
  const search = searchParams.get("q");

  const where: any = {};

  if (vendorId) {
    where.vendorId = vendorId;
  } else if (session.user.role !== "ADMIN") {
    where.vendorId = session.user.id;
  }

  if (categoryId) where.categoryId = categoryId;
  if (isPublished !== null) where.isPublished = isPublished === "true";
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        variants: true,
        images: { orderBy: { sortOrder: "asc" } },
        vendor: { select: { businessName: true, businessEmail: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    products,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["LENDER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Vendor access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, brand, description, categoryId, basePrice, isPublished, isFeatured, images, variants } = body;

    if (!title || !brand || !description || !basePrice || !variants?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (images.length === 0) {
      return NextResponse.json({ error: "At least one image is required" }, { status: 400 });
    }

    // Generate slug
    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Generate SKUs for variants if not provided
    const processedVariants = variants.map((v: any, index: number) => ({
      sku: v.sku || `${baseSlug.toUpperCase().slice(0, 4)}-${v.size.toUpperCase()}-${index + 1}`,
      size: v.size,
      color: v.color || null,
      price: v.price ? Number(v.price) : null,
      stock: Number(v.stock) || 0,
      isActive: v.isActive !== false,
    }));

    const product = await prisma.product.create({
      data: {
        vendorId: session.user.id,
        categoryId: categoryId || null,
        slug,
        title,
        brand,
        description,
        basePrice: Number(basePrice),
        isPublished: isPublished ?? false,
        isFeatured: isFeatured ?? false,
        images: {
          create: images.map((url: string, index: number) => ({
            url,
            sortOrder: index,
          })),
        },
        variants: {
          create: processedVariants,
        },
      },
      include: {
        variants: true,
        images: true,
        category: true,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Product creation error:", error);
    return NextResponse.json({ error: "Unable to create product" }, { status: 500 });
  }
}