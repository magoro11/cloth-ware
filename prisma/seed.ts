import { PrismaClient, ItemCondition, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@rewear.io" },
    update: { role: UserRole.ADMIN },
    create: {
      email: "admin@rewear.io",
      name: "ReWear Admin",
      role: UserRole.ADMIN,
      passwordHash: await hash("Admin12345!", 10),
    },
  });

  const lender = await prisma.user.upsert({
    where: { email: "lender@rewear.io" },
    update: { role: UserRole.LENDER },
    create: {
      email: "lender@rewear.io",
      name: "Ava Laurent",
      role: UserRole.LENDER,
      passwordHash: await hash("Lender12345!", 10),
    },
  });

  const item = await prisma.item.upsert({
    where: { id: "sample-item-1" },
    update: {},
    create: {
      id: "sample-item-1",
      ownerId: lender.id,
      title: "Silk Evening Dress",
      brand: "Valencia Atelier",
      description: "Elegant silk gown with fitted waist and flowing hem, ideal for gala evenings.",
      category: "Dress",
      size: "M",
      condition: ItemCondition.EXCELLENT,
      rentalPricePerDay: 12900,
      sellingPrice: 189000,
      securityDeposit: 25000,
      featured: true,
      images: {
        createMany: {
          data: [
            {
              url: "https://images.unsplash.com/photo-1543076447-215ad9ba6923?q=80&w=1200&auto=format&fit=crop",
              sortOrder: 0,
            },
            {
              url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&auto=format&fit=crop",
              sortOrder: 1,
            },
          ],
        },
      },
    },
  });

  await prisma.review.createMany({
    data: [
      { itemId: item.id, authorId: admin.id, rating: 5, comment: "Arrived pristine and exactly as pictured." },
      { itemId: item.id, authorId: lender.id, rating: 5, comment: "Kept in top condition and professionally cleaned." },
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
