import { prisma } from "C:/Users/brighton/Desktop/projects/cloth project/nextjs-superbase/backend/lib/prisma";
async function main() {
  try {
    const c = await prisma.user.count();
    console.log("USER_COUNT", c);
    const u = await prisma.user.findFirst({
      select: { id: true, email: true, emailVerified: true, role: true, isBanned: true },
    });
    console.log("SAMPLE_USER", JSON.stringify(u));
  } catch (e) {
    console.error("ERR", String(e));
  } finally {
    await prisma.$disconnect();
  }
}
main();
