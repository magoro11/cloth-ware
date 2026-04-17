import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { databaseErrorMessage, errorStatus, logDatabaseIssue } from "@/lib/errors";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        ok: true,
        service: "database",
        checkedAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    logDatabaseIssue("Database health check failed", error);

    return NextResponse.json(
      {
        ok: false,
        service: "database",
        error: databaseErrorMessage(error),
        checkedAt: new Date().toISOString(),
      },
      { status: errorStatus(error, 500) },
    );
  }
}
