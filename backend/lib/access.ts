import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new AuthError("Unauthorized", 401);
  }
  return session.user;
}

export async function requireRole(roles: Array<"CUSTOMER" | "LENDER" | "ADMIN">) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
