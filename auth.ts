import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import { compare } from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import { prisma } from "@/lib/prisma";

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
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    ...(isGoogleAuthConfigured
      ? [
          Google({
            clientId: googleClientId!,
            clientSecret: googleClientSecret!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const input = z
          .object({
            email: z.string().email(),
            password: z.string().min(8),
          })
          .safeParse(raw);

        if (!input.success) return null;
        const normalizedEmail = input.data.email.trim().toLowerCase();
        let user;
        try {
          user = await prismaAny.user.findFirst({
            where: { email: { equals: normalizedEmail, mode: "insensitive" } },
          });
        } catch (error) {
          console.error("Credentials lookup failed", error);
          return null;
        }
        if (!user?.passwordHash || user.isBanned) return null;

        const isValid = await compare(input.data.password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const role = (user as { role?: "CUSTOMER" | "LENDER" | "ADMIN" }).role;
        token.role = role ?? "CUSTOMER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "CUSTOMER" | "LENDER" | "ADMIN") || "CUSTOMER";
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
