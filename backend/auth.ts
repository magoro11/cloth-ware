import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import { compare } from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const DUMMY_HASH =
  "$2b$12$rRjZYQ7VdJ1yQq7VdJ1yQO7VdJ1yQO7VdJ1yQO7VdJ1yQO7VdJ1yQ";

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

const prismaAny = prisma as any;

const envAuthSecret = process.env.AUTH_SECRET;
const envNextAuthSecret = process.env.NEXTAUTH_SECRET;
const authSecret = envAuthSecret ?? envNextAuthSecret;
const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const isGoogleAuthConfigured = Boolean(googleClientId && googleClientSecret);

if (envAuthSecret && envNextAuthSecret && envAuthSecret !== envNextAuthSecret) {
  console.error(
    "Auth configuration error: AUTH_SECRET and NEXTAUTH_SECRET must match or only one should be set.",
  );
}

if (process.env.NODE_ENV === "production" && !authSecret) {
  console.error("Auth configuration error: set AUTH_SECRET or NEXTAUTH_SECRET in the runtime environment.");
}

const config: NextAuthConfig = {
  secret: authSecret,
  basePath: "/api/auth",
  session: { strategy: "jwt", maxAge: 60 * 15 },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    ...(isGoogleAuthConfigured
      ? [
          Google({
            clientId: googleClientId!,
            clientSecret: googleClientSecret!,
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw, request) => {
        const input = z
          .object({
            email: z.string().email(),
            password: z.string().min(8),
          })
          .safeParse(raw);

        if (!input.success) return null;

        const ip = clientIp(request);
        const limited = rateLimit(`auth:signin:${ip}`, { limit: 10, windowMs: 60 * 60 * 1000 });
        if (!limited.success) return null;

        const normalizedEmail = input.data.email.trim().toLowerCase();
        let user;
        try {
          user = await prismaAny.user.findFirst({
            where: { emailLower: { equals: normalizedEmail } },
          });
        } catch (error) {
          console.error("Credentials lookup failed", error);
          return null;
        }

        if (!user) {
          await compare(input.data.password, DUMMY_HASH);
          return null;
        }

        if (!user.passwordHash || user.isBanned || !user.emailVerified) return null;

        try {
          const isValid = await compare(input.data.password, user.passwordHash);
          if (!isValid) return null;
        } catch {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          stripeConnectedId: user.stripeConnectedId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const role = (user as { role?: "CUSTOMER" | "LENDER" | "ADMIN"; stripeConnectedId?: string | null }).role;
        token.role = role ?? "CUSTOMER";
        token.stripeConnectedId = (user as { stripeConnectedId?: string | null }).stripeConnectedId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "CUSTOMER" | "LENDER" | "ADMIN") || "CUSTOMER";
        session.user.stripeConnectedId = token.stripeConnectedId ?? null;
      }
      return session;
    },
  },
};

if (authUrl) {
  process.env.AUTH_URL ??= authUrl;
  process.env.NEXTAUTH_URL ??= authUrl;
}

if (authSecret) {
  process.env.AUTH_SECRET ??= authSecret;
  process.env.NEXTAUTH_SECRET ??= authSecret;
}

if (isGoogleAuthConfigured) {
  config.adapter = PrismaAdapter(prisma);
}

export const { handlers, signIn, signOut, auth } = NextAuth(config);
