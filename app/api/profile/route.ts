import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { errorStatus } from "@/lib/errors";
import { isPrismaUnknownFieldError } from "@/lib/prisma-compat";

const prismaAny = prisma as any;

const schema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().max(20).optional().nullable(),
  addressLine1: z.string().max(120).optional().nullable(),
  addressLine2: z.string().max(120).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  preferredPaymentMethod: z.enum(["CARD", "MPESA"]).optional().nullable(),
  preferredFulfillmentMethod: z.enum(["DELIVERY", "PICKUP"]).optional().nullable(),
  image: z.string().url().optional().nullable().or(z.literal("")),
});

export async function GET() {
  try {
    const user = await requireUser();
    let profile;
    try {
      profile = await prismaAny.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          phone: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          country: true,
          preferredPaymentMethod: true,
          preferredFulfillmentMethod: true,
        },
      });
    } catch (error) {
      if (!isPrismaUnknownFieldError(error)) throw error;
      const legacyProfile = await prismaAny.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
        },
      });
      profile = legacyProfile
        ? {
            ...legacyProfile,
            phone: null,
            addressLine1: null,
            addressLine2: null,
            city: null,
            country: null,
            preferredPaymentMethod: null,
            preferredFulfillmentMethod: null,
          }
        : null;
    }

    return NextResponse.json({ profile });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unable to load profile";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : errorStatus(error, 400) });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const payload = schema.parse(await request.json());

    let profile;
    try {
      profile = await prismaAny.user.update({
        where: { id: user.id },
        data: {
          name: payload.name,
          phone: payload.phone || null,
          addressLine1: payload.addressLine1 || null,
          addressLine2: payload.addressLine2 || null,
          city: payload.city || null,
          country: payload.country || null,
          preferredPaymentMethod: payload.preferredPaymentMethod || null,
          preferredFulfillmentMethod: payload.preferredFulfillmentMethod || null,
          image: payload.image || null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          phone: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          country: true,
          preferredPaymentMethod: true,
          preferredFulfillmentMethod: true,
        },
      });
    } catch (error) {
      if (!isPrismaUnknownFieldError(error)) throw error;
      const legacyProfile = await prismaAny.user.update({
        where: { id: user.id },
        data: {
          name: payload.name,
          image: payload.image || null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
        },
      });
      profile = {
        ...legacyProfile,
        phone: null,
        addressLine1: null,
        addressLine2: null,
        city: null,
        country: null,
        preferredPaymentMethod: null,
        preferredFulfillmentMethod: null,
      };
    }

    return NextResponse.json({ profile });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unable to save profile";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : errorStatus(error, 400) });
  }
}
