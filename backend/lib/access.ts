import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new AuthError("Unauthorized", 401);
  }
  return session.user;
}

export async function requireRole(roles: Array<"CUSTOMER" | "LENDER" | "ADMIN">) {
  const user = await requireUser();
  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true, isBanned: true },
  });
  if (!fresh || fresh.isBanned) {
    throw new AuthError("Forbidden", 403);
  }
  if (!roles.includes(fresh.role)) {
    throw new AuthError("Forbidden", 403);
  }
  return { ...user, role: fresh.role, isBanned: fresh.isBanned };
}

export async function adminAction<T>(fn: () => Promise<T>): Promise<T> {
  await requireRole(["ADMIN"]);
  return fn();
}

export async function protectedAction<T>(fn: () => Promise<T>): Promise<T> {
  await requireUser();
  return fn();
}

export async function roleAction<T>(
  roles: Array<"CUSTOMER" | "LENDER" | "ADMIN">,
  fn: () => Promise<T>,
): Promise<T> {
  await requireRole(roles);
  return fn();
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
