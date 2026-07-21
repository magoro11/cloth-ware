import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access";
import { sendEmailNotification } from "@/backend/lib/notifications";
import { errorStatus } from "@/backend/lib/errors";

const schema = z.object({
  action: z.enum(["delivered", "returned"]),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { action } = schema.parse(await request.json());

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        item: {
          select: {
            title: true,
            brand: true,
            ownerId: true,
          },
        },
        customer: { select: { email: true, name: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only the item owner (seller) can update delivery/return status
    if (booking.item.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let newStatus: "ACTIVE" | "COMPLETED";
    let emailSubject: string;
    let emailHtml: string;

    if (action === "delivered") {
      if (!["CONFIRMED"].includes(booking.status)) {
        return NextResponse.json(
          { error: "Can only mark as delivered when booking is confirmed." },
          { status: 409 },
        );
      }
      newStatus = "ACTIVE";
      emailSubject = `Your rental is on its way – ${booking.item.title}`;
      emailHtml = `<p>Hi ${booking.customer.name || "there"},</p><p>Great news! Your <strong>${booking.item.brand} ${booking.item.title}</strong> has been delivered. Enjoy your rental!</p>`;
    } else {
      // returned
      if (!["ACTIVE", "LATE"].includes(booking.status)) {
        return NextResponse.json(
          { error: "Can only mark as returned when rental is active." },
          { status: 409 },
        );
      }
      newStatus = "COMPLETED";
      emailSubject = `Return received – ${booking.item.title}`;
      emailHtml = `<p>Hi ${booking.customer.name || "there"},</p><p>We've received your return for <strong>${booking.item.brand} ${booking.item.title}</strong>. Your deposit refund will be processed shortly.</p>`;
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: newStatus,
        ...(action === "returned" ? { returnDate: new Date() } : {}),
      },
    });

    if (booking.customer.email) {
      await sendEmailNotification({
        to: booking.customer.email,
        subject: emailSubject,
        html: emailHtml,
      });
    }

    return NextResponse.json({ booking: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid action" }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : "Unable to update booking status";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : errorStatus(error, 400) },
    );
  }
}
