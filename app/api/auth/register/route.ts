import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { databaseErrorMessage, errorStatus, isDatabaseUnavailable } from "@/lib/errors";

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(["CUSTOMER", "LENDER"]).default("CUSTOMER"),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json());
    const data = { ...parsed, email: parsed.email.trim().toLowerCase() };
    const existing = await prisma.user.findFirst({
      where: { email: { equals: data.email, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid request";

    return NextResponse.json(
      { error: isDatabaseUnavailable(error) ? databaseErrorMessage(error) : message },
      { status: errorStatus(error, 400) },
    );
  }
}
