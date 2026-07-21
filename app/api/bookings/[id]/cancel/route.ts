import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access";
import { sendEmailNotification } from "@/backend/lib/notifications";
import { errorStatus } from "@/backend/lib/errors";

const schema = z.object({
  reason: z.string().max(400).optional(),
});

// Only PENDING or CONFIRMED bookings can be cancelled by the customer.
const CANCELLABLE_STATUSES = ["PENDING", "CONFIRMED"] as const;

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const payload = schema.parse(await request.json().catch(() => ({})));

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        item: {
          include: { owner: { select: { email: true, name: true } } },
        },
        customer: { select: { email: true, name: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only the customer who made the booking can cancel it
    if (booking.customerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!CANCELLABLE_STATUSES.includes(booking.status as (typeof CANCELLABLE_STATUSES)[number])) {
      return NextResponse.json(
        {
          error: `Booking cannot be cancelled in its current status (${booking.status}). Contact support for active or completed rentals.`,
        },
        { status: 409 },
      );
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELED" },
    });

    // Notify the seller
    if (booking.item.owner.email) {
      await sendEmailNotification({
        to: booking.item.owner.email,
        subject: `Booking cancelled – ${booking.item.title}`,
        html: `<p>The booking for <strong>${booking.item.title}</strong> has been cancelled by ${booking.customer.name || booking.customer.email || "the customer"}${payload.reason ? `: "${payload.reason}"` : "."}</p>`,
      });
    }

    return NextResponse.json({ booking: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unable to cancel booking";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : errorStatus(error, 400) },
    );
  }
}
