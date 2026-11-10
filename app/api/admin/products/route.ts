import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: { isPublished: true },
      include: { seller: { select: { email: true, name: true } } },
    });

    // TODO: Send notification to seller

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Product approval error:", error);
    return NextResponse.json({ error: "Unable to approve product" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { productId, isPublished } = body;

    if (!productId || typeof isPublished !== "boolean") {
      return NextResponse.json({ error: "Product ID and isPublished required" }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: { isPublished },
      include: { seller: { select: { email: true, name: true } } },
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Product status update error:", error);
    return NextResponse.json({ error: "Unable to update product status" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    await prisma.product.delete({ where: { id: productId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Product deletion error:", error);
    return NextResponse.json({ error: "Unable to delete product" }, { status: 500 });
  }
}