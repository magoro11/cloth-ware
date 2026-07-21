import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access";
import { errorStatus } from "@/backend/lib/errors";
import { sendEmailNotification } from "@/backend/lib/notifications";

export async function POST() {
  try {
    const user = await requireUser();

    if (user.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "Your account is already a seller or admin account." },
        { status: 409 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: "LENDER" },
      select: { id: true, email: true, name: true, role: true },
    });

    // Notify the user
    if (updated.email) {
      await sendEmailNotification({
        to: updated.email,
        subject: "Your seller account is ready",
        html: `<p>Hi ${updated.name || "there"},</p><p>Your AdvanceReWear account has been upgraded to <strong>Seller</strong>. You can now list items from the <a href="/list-item">Seller Hub</a>.</p>`,
      });
    }

    return NextResponse.json({ role: updated.role });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unable to upgrade role";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : errorStatus(error, 400) },
    );
  }
}
