"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser, AuthError } from "@/lib/access";
import { prisma } from "@/lib/prisma";

const addressSchema = z.object({
  label: z.string().min(1).max(30).default("home"),
  name: z.string().min(2).max(100),
  phone: z.string().min(5).max(40),
  line1: z.string().min(2).max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(2).max(100),
  county: z.string().min(2).max(100),
  country: z.string().min(2).max(5).default("KE"),
  postalCode: z.string().max(20).optional().nullable(),
  isDefault: z.boolean().default(false),
});

export async function listAddresses() {
  const user = await requireUser();
  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
  return { addresses };
}

export async function createAddress(input: z.infer<typeof addressSchema>) {
  const user = await requireUser();
  const parsed = addressSchema.parse(input);

  if (parsed.isDefault) {
    await prisma.address.updateMany({ where: { userId: user.id, isDefault: true }, data: { isDefault: false } });
  }

  const address = await prisma.address.create({
    data: { userId: user.id, ...parsed },
  });
  revalidatePath("/account/addresses");
  return { address };
}

export async function updateAddress(input: { id: string } & Partial<z.infer<typeof addressSchema>>) {
  const user = await requireUser();
  const address = await prisma.address.findUnique({ where: { id: input.id }, select: { id: true, userId: true } });
  if (!address) throw new AuthError("Not found", 404);
  if (address.userId !== user.id) throw new AuthError("Forbidden", 403);

  const data: any = { ...input };
  delete data.id;
  if (data.isDefault === true) {
    await prisma.address.updateMany({ where: { userId: user.id, isDefault: true }, data: { isDefault: false } });
  }

  const updated = await prisma.address.update({ where: { id: input.id }, data });
  revalidatePath("/account/addresses");
  return { address: updated };
}

export async function deleteAddress(input: { id: string }) {
  const user = await requireUser();
  const address = await prisma.address.findUnique({ where: { id: input.id }, select: { id: true, userId: true } });
  if (!address) throw new AuthError("Not found", 404);
  if (address.userId !== user.id) throw new AuthError("Forbidden", 403);

  await prisma.address.delete({ where: { id: input.id } });
  revalidatePath("/account/addresses");
  return { ok: true };
}
