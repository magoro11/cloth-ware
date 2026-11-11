"use server";

import { revalidatePath } from "next/cache";
import { adminAction } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function approveListingAction(formData: FormData) {
  return adminAction(async () => {
    const listingId = String(formData.get("listingId") || "");
    if (!listingId) return;

    await prisma.product.update({
      where: { id: listingId },
      data: { isFeatured: true },
    });

    revalidatePath("/dashboard/admin");
    revalidatePath("/marketplace");
  });
}
