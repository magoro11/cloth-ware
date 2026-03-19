import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MessageCenter } from "@/components/message-center";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const [customerBookings, sellerBookings] = await Promise.all([
    prisma.booking.findMany({
      where: { customerId: session.user.id },
      include: { item: { select: { owner: { select: { id: true, name: true, email: true } } } } },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.findMany({
      where: { item: { ownerId: session.user.id } },
      include: { customer: { select: { id: true, name: true, email: true } } },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const contactsMap = new Map<string, { id: string; label: string; role: "BUYER" | "SELLER" }>();

  for (const booking of customerBookings) {
    contactsMap.set(booking.item.owner.id, {
      id: booking.item.owner.id,
      label: booking.item.owner.name || booking.item.owner.email || "Seller",
      role: "SELLER",
    });
  }

  for (const booking of sellerBookings) {
    contactsMap.set(booking.customer.id, {
      id: booking.customer.id,
      label: booking.customer.name || booking.customer.email || "Buyer",
      role: "BUYER",
    });
  }

  const contacts = Array.from(contactsMap.values());

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-serif text-4xl">Messaging</h1>
      <p className="mt-2 text-sm opacity-70">Real-time chat between buyers and sellers.</p>
      <div className="mt-6">
        <MessageCenter currentUserId={session.user.id} contacts={contacts} />
      </div>
    </main>
  );
}
