import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const isGoogleAuthConfigured = Boolean(googleClientId && googleClientSecret);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
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
        const user = await prisma.user.findFirst({
          where: { email: { equals: normalizedEmail, mode: "insensitive" } },
        });
        if (!user?.passwordHash) return null;

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
});
