import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/profile-form";
import { isPrismaUnknownFieldError } from "@/lib/prisma-compat";

const prismaAny = prisma as any;

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  let profile;
  try {
    profile = await prismaAny.user.findUnique({
      where: { id: session.user.id },
      select: {
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
      where: { id: session.user.id },
      select: {
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

  if (!profile) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <ProfileForm initialProfile={profile} />
    </main>
  );
}
