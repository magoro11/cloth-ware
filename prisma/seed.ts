import { PrismaClient, Condition, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@clothmarketplace.io" },
    update: { role: UserRole.ADMIN },
    create: {
      email: "admin@clothmarketplace.io",
      emailLower: "admin@clothmarketplace.io",
      name: "Cloth Marketplace Admin",
      role: UserRole.ADMIN,
      emailVerified: new Date(),
      passwordHash: await hash("Admin12345!", 10),
    },
  });

  const seller = await prisma.user.upsert({
    where: { email: "seller@clothmarketplace.io" },
    update: { role: UserRole.LENDER },
    create: {
      email: "seller@clothmarketplace.io",
      emailLower: "seller@clothmarketplace.io",
      name: "Kwame Mensah",
      role: UserRole.LENDER,
      emailVerified: new Date(),
      passwordHash: await hash("Seller12345!", 10),
    },
  });

  const dressCategory = await prisma.category.upsert({
    where: { slug: "dresses" },
    update: {},
    create: {
      name: "Dresses",
      slug: "dresses",
      imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=1200&auto=format&fit=crop",
    },
  });

  const shirtsCategory = await prisma.category.upsert({
    where: { slug: "shirts-and-blouses" },
    update: {},
    create: {
      name: "Shirts & Blouses",
      slug: "shirts-and-blouses",
      imageUrl: "https://images.unsplash.com/photo-1596756028547-a88e0a9ad798?q=80&w=1200&auto=format&fit=crop",
    },
  });

  const trousersCategory = await prisma.category.upsert({
    where: { slug: "trousers-and-jeans" },
    update: {},
    create: {
      name: "Trousers & Jeans",
      slug: "trousers-and-jeans",
      imageUrl: "https://images.unsplash.com/photo-1542273917363-3b182515e699?q=80&w=1200&auto=format&fit=crop",
    },
  });

  const jacketCategory = await prisma.category.upsert({
    where: { slug: "jackets-and-coats" },
    update: {},
    create: {
      name: "Jackets & Coats",
      slug: "jackets-and-coats",
      imageUrl: "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?q=80&w=1200&auto=format&fit=crop",
    },
  });

  const traditionalCategory = await prisma.category.upsert({
    where: { slug: "traditional-wear" },
    update: {},
    create: {
      name: "Traditional Wear",
      slug: "traditional-wear",
      imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1200&auto=format&fit=crop",
    },
  });

  const brands = await Promise.all([
    "Valencia Atelier",
    "Coastal Weave",
    "Heritage Denim Co.",
    "Urban Outerwear",
    "Heritage Prints",
  ].map((name) =>
    prisma.brand.upsert({
      where: { name },
      update: {},
      create: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80) },
    }),
  ));

  const [valenciaAtelier, coastalWeave, heritageDenim, urbanOuterwear, heritagePrints] = brands;

  const eveningDress = await prisma.product.upsert({
    where: { id: "sample-product-1" },
    update: {},
    create: {
      id: "sample-product-1",
      vendorId: seller.id,
      brandId: valenciaAtelier.id,
      categoryId: dressCategory.id,
      slug: "silk-evening-dress",
      title: "Silk Evening Dress",
      description: "Elegant silk gown with fitted waist and flowing hem, ideal for gala evenings.",
      basePrice: 189000,
      isPublished: true,
      isFeatured: true,
      stockAlert: 5,
      variants: {
        create: [
          { sku: "DRS-SILK-S", size: "S", color: "Navy", price: 189000, stock: 3 },
          { sku: "DRS-SILK-M", size: "M", color: "Navy", price: 189000, stock: 5 },
          { sku: "DRS-SILK-L", size: "L", color: "Navy", price: 189000, stock: 4 },
        ],
      },
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1543076447-215ad9ba6923?q=80&w=1200&auto=format&fit=crop", sortOrder: 0 },
          { url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&auto=format&fit=crop", sortOrder: 1 },
        ],
      },
    },
  });

  const linenShirt = await prisma.product.upsert({
    where: { id: "sample-product-2" },
    update: {},
    create: {
      id: "sample-product-2",
      vendorId: seller.id,
      brandId: coastalWeave.id,
      categoryId: shirtsCategory.id,
      slug: "linen-button-down-shirt",
      title: "Linen Button-Down Shirt",
      description: "Breathable linen button-down shirt, perfect for warm weather.",
      basePrice: 85000,
      isPublished: true,
      isFeatured: true,
      stockAlert: 5,
      variants: {
        create: [
          { sku: "SHRT-LINEN-S", size: "S", color: "White", price: 85000, stock: 6 },
          { sku: "SHRT-LINEN-M", size: "M", color: "White", price: 85000, stock: 8 },
          { sku: "SHRT-LINEN-L", size: "L", color: "White", price: 85000, stock: 7 },
          { sku: "SHRT-LINEN-M-BLUE", size: "M", color: "Sky Blue", price: 89000, stock: 5 },
        ],
      },
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1596756028547-a88e0a9ad798?q=80&w=1200&auto=format&fit=crop", sortOrder: 0 },
        ],
      },
    },
  });

  const denimJeans = await prisma.product.upsert({
    where: { id: "sample-product-3" },
    update: {},
    create: {
      id: "sample-product-3",
      vendorId: seller.id,
      brandId: heritageDenim.id,
      categoryId: trousersCategory.id,
      slug: "classic-denim-jeans",
      title: "Classic Denim Jeans",
      description: "Mid-rise classic denim jeans with comfortable stretch.",
      basePrice: 115000,
      isPublished: true,
      isFeatured: false,
      stockAlert: 5,
      variants: {
        create: [
          { sku: "JEAN-DENIM-32", size: "32", color: "Indigo", price: 115000, stock: 4 },
          { sku: "JEAN-DENIM-34", size: "34", color: "Indigo", price: 115000, stock: 5 },
          { sku: "JEAN-DENIM-36", size: "36", color: "Indigo", price: 115000, stock: 3 },
        ],
      },
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1542273917363-3b182515e699?q=80&w=1200&auto=format&fit=crop", sortOrder: 0 },
        ],
      },
    },
  });

  const woolCoat = await prisma.product.upsert({
    where: { id: "sample-product-4" },
    update: {},
    create: {
      id: "sample-product-4",
      vendorId: seller.id,
      brandId: urbanOuterwear.id,
      categoryId: jacketCategory.id,
      slug: "wool-blend-coat",
      title: "Wool Blend Coat",
      description: "Warm wool blend coat for cooler seasons.",
      basePrice: 245000,
      isPublished: true,
      isFeatured: false,
      stockAlert: 5,
      variants: {
        create: [
          { sku: "COAT-WOOL-S", size: "S", color: "Camel", price: 245000, stock: 2 },
          { sku: "COAT-WOOL-M", size: "M", color: "Camel", price: 245000, stock: 3 },
          { sku: "COAT-WOOL-L", size: "L", color: "Camel", price: 245000, stock: 2 },
        ],
      },
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?q=80&w=1200&auto=format&fit=crop", sortOrder: 0 },
        ],
      },
    },
  });

  const kenteDress = await prisma.product.upsert({
    where: { id: "sample-product-5" },
    update: {},
    create: {
      id: "sample-product-5",
      vendorId: seller.id,
      brandId: heritagePrints.id,
      categoryId: traditionalCategory.id,
      slug: "kente-print-dress",
      title: "Kente Print Dress",
      description: "Vibrant Kente print dress celebrating African heritage.",
      basePrice: 135000,
      isPublished: true,
      isFeatured: true,
      stockAlert: 5,
      variants: {
        create: [
          { sku: "KT-DRESS-M", size: "M", color: "Multicolor", price: 135000, stock: 4 },
          { sku: "KT-DRESS-L", size: "L", color: "Multicolor", price: 135000, stock: 3 },
        ],
      },
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1200&auto=format&fit=crop", sortOrder: 0 },
        ],
      },
    },
  });

  await prisma.review.createMany({
    data: [
      { productId: eveningDress.id, userId: admin.id, rating: 5, comment: "Arrived pristine and exactly as pictured." },
      { productId: linenShirt.id, userId: seller.id, rating: 5, comment: "Breathable fabric, great quality." },
      { productId: denimJeans.id, userId: admin.id, rating: 4, comment: "Comfortable fit and sturdy denim." },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
