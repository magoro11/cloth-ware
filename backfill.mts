import { prisma } from "./backend/lib/prisma";
async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, emailLower: true, emailVerified: true } });
  for (const u of users) {
    if (u.email) {
      await prisma.user.update({
        where: { id: u.id },
        data: { emailLower: u.email.toLowerCase(), emailVerified: u.emailVerified ?? new Date() },
      });
    }
  }
  const count = await prisma.user.count();
  console.log("BACKFILLED", users.length, "users; total", count);
  await prisma.$disconnect();
}
main();
