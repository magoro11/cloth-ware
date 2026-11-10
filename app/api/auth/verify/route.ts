import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email) {
    return NextResponse.json({ error: "Missing token or email" }, { status: 400 });
  }

  const emailLower = email.trim().toLowerCase();

  const verificationToken = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: emailLower, token } },
  });

  if (!verificationToken || verificationToken.expires < new Date()) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { emailLower },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({
      where: { identifier_token: { identifier: emailLower, token } },
    }),
  ]);

  return NextResponse.json({ message: "Email verified" });
}
