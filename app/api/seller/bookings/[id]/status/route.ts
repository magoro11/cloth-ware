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

    const subOrder = await prisma.subOrder.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            userId: true,
            user: { select: { email: true, name: true } },
          },
        },
        vendor: {
          select: {
            userId: true,
            businessName: true,
          },
        },
        items: {
          select: {
            product: { select: { title: true, brand: { select: { name: true } } } },
          },
        },
      },
    });

    if (!subOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (subOrder.vendor.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let newStatus: "DELIVERED" | "CANCELED";
    let emailSubject: string;
    let emailHtml: string;

    const item = subOrder.items[0]?.product;
    const title = item?.title ?? "your order";
    const brandName = item?.brand?.name;

    if (action === "delivered") {
      if (subOrder.status !== "CONFIRMED") {
        return NextResponse.json(
          { error: "Can only mark as delivered when order is confirmed." },
          { status: 409 },
        );
      }
      newStatus = "DELIVERED";
      emailSubject = `Your order is on its way – ${title}`;
      emailHtml = `<p>Hi ${subOrder.order.user.name || "there"},</p><p>Great news! Your <strong>${brandName ? brandName + " " : ""}${title}</strong> has been delivered.</p>`;
    } else {
      if (subOrder.status !== "DELIVERED") {
        return NextResponse.json(
          { error: "Can only mark as returned when order is delivered." },
          { status: 409 },
        );
      }
      newStatus = "CANCELED";
      emailSubject = `Return received – ${title}`;
      emailHtml = `<p>Hi ${subOrder.order.user.name || "there"},</p><p>We've received your return for <strong>${brandName ? brandName + " " : ""}${title}</strong>.</p>`;
    }

    const updated = await prisma.subOrder.update({
      where: { id: subOrder.id },
      data: {
        status: newStatus,
        ...(action === "delivered" ? { deliveredAt: new Date() } : {}),
      },
    });

    if (subOrder.order.user.email) {
      await sendEmailNotification({
        to: subOrder.order.user.email,
        subject: emailSubject,
        html: emailHtml,
      });
    }

    return NextResponse.json({ subOrder: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid action" }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : "Unable to update order status";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 401 : errorStatus(error, 400) },
    );
  }
}
