import { auth } from "@/auth";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function requireRole(roles: Array<"CUSTOMER" | "LENDER" | "ADMIN">) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}
