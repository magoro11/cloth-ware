import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { databaseErrorMessage, errorStatus, isDatabaseUnavailable } from "@/backend/lib/errors";

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100).refine((val) => /[A-Z]/.test(val) && /[a-z]/.test(val) && /[0-9]/.test(val), {
    message: "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  }),
});

const DUMMY_HASH =
  "$2b$12$rRjZYQ7VdJ1yQq7VdJ1yQO7VdJ1yQO7VdJ1yQO7VdJ1yQO7VdJ1yQ";

function makeToken(): string {
  return randomBytes(32).toString("hex");
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
      ?? request.headers.get("x-real-ip")
      ?? "unknown";
    const limited = rateLimit(`auth:register:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
    if (!limited.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const parsed = schema.parse(await request.json());
    const emailLower = parsed.email.trim().toLowerCase();

    const existing = await prisma.user.findFirst({
      where: { emailLower: { equals: emailLower } },
      select: { id: true },
    });

    await hash(DUMMY_HASH, 12);

    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await hash(parsed.password, 12);
    const token = makeToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.user.create({
        data: {
          name: parsed.name,
          email: parsed.email.trim(),
          emailLower,
          passwordHash,
          role: "CUSTOMER",
          emailVerified: null,
        },
        select: { id: true, email: true, name: true },
      }),
      prisma.verificationToken.create({
        data: { identifier: emailLower, token, expires },
      }),
    ]);

    if (process.env.NODE_ENV !== "production") {
      console.info(`[auth] verification token for ${emailLower}: ${token}`);
    }

    return NextResponse.json(
      { user: { email: parsed.email.trim() }, message: "Check your email to verify your account" },
      { status: 201 },
    );
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    const message =
      error instanceof Error ? error.message : "Invalid request";

    return NextResponse.json(
      { error: isDatabaseUnavailable(error) ? databaseErrorMessage(error) : message },
      { status: errorStatus(error, 400) },
    );
  }
}
