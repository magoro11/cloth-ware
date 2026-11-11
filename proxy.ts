import { getToken } from "next-auth/jwt";
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const protectedPrefixes = ["/admin", "/lender", "/dashboard/admin", "/dashboard/seller"];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // NextAuth-based auth protection for protected routes
  if (protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
    if (!token) {
      const url = new URL("/auth/signin", request.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Update Supabase session
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
