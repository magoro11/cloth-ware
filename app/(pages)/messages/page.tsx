import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MessageCenter } from "@/frontend/components/message-center";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ contact?: string }>;

export default async function MessagesPage(props: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  const searchParams = await props.searchParams;

  const [customerOrders, vendorOrders] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.user.id },
      include: {
        subOrders: {
          include: {
            vendor: { select: { id: true, businessName: true, businessEmail: true } },
          },
        },
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: {
        subOrders: { some: { vendorId: session.user.id } },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        subOrders: {
          where: { vendorId: session.user.id },
          include: {
            vendor: { select: { id: true, businessName: true, businessEmail: true } },
          },
        },
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const contactsMap = new Map<string, { id: string; label: string; role: "BUYER" | "SELLER" }>();

  for (const order of customerOrders) {
    for (const so of order.subOrders) {
      contactsMap.set(so.vendor.id, {
        id: so.vendor.id,
        label: so.vendor.businessName || so.vendor.businessEmail || "Seller",
        role: "SELLER",
      });
    }
  }

  for (const order of vendorOrders) {
    contactsMap.set(order.user.id, {
      id: order.user.id,
      label: order.user.name || order.user.email || "Buyer",
      role: "BUYER",
    });
  }

  const contacts = Array.from(contactsMap.values());

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-serif text-4xl">Messaging</h1>
      <p className="mt-2 text-sm opacity-70">Real-time chat between buyers and sellers.</p>
      <div className="mt-6">
        <MessageCenter currentUserId={session.user.id} contacts={contacts} initialActiveId={searchParams.contact} />
      </div>
    </main>
  );
}
