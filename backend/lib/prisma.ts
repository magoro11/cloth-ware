import { PrismaClient } from "@prisma/client";
import { normalizeDatabaseEnv } from "@/lib/database-env";

declare global {
  var prisma: PrismaClient | undefined;
}

normalizeDatabaseEnv();

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
