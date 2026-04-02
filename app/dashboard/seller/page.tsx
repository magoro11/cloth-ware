import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { SellerListingActions } from "@/components/seller-listing-actions";

const prismaAny = prisma as any;

export const dynamic = "force-dynamic";

export default async function SellerDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  if (session.user.role === "CUSTOMER") redirect("/dashboard/user");
  if (session.user.role === "ADMIN") redirect("/dashboard/admin");

  const [listings, orders] = await Promise.all([
    prismaAny.item.findMany({
      where: { ownerId: session.user.id },
      include: { bookings: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prismaAny.booking.findMany({
      where: { item: { ownerId: session.user.id } },
      include: { customer: { select: { name: true, email: true } }, item: { select: { title: true, brand: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const grossRevenue = orders
    .filter((order: any) => ["CONFIRMED", "ACTIVE", "LATE", "COMPLETED"].includes(order.status))
    .reduce((acc: number, order: any) => acc + order.rentalAmount, 0);
  const payoutProjection = orders
    .filter((order: any) => ["CONFIRMED", "ACTIVE", "LATE", "COMPLETED"].includes(order.status))
    .reduce((acc: number, order: any) => acc + order.ownerPayoutAmount, 0);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-serif text-4xl">Seller Dashboard</h1>
      <p className="mt-2 text-sm opacity-70">Inventory, orders, and earnings overview.</p>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="text-xs uppercase tracking-wide opacity-65">Active listings</p>
          <p className="mt-1 text-2xl font-semibold">{listings.length}</p>
        </div>
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="text-xs uppercase tracking-wide opacity-65">Orders</p>
          <p className="mt-1 text-2xl font-semibold">{orders.length}</p>
        </div>
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="text-xs uppercase tracking-wide opacity-65">Gross revenue</p>
          <p className="mt-1 text-2xl font-semibold">{formatCurrency(grossRevenue)}</p>
        </div>
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="text-xs uppercase tracking-wide opacity-65">Projected payouts</p>
          <p className="mt-1 text-2xl font-semibold">{formatCurrency(payoutProjection)}</p>
        </div>
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-2xl">Inventory management</h2>
            <Link href="/list-item" className="text-sm underline opacity-75">
              Add listing
            </Link>
          </div>
          <div className="space-y-2 text-sm">
            {listings.length === 0 ? <p className="opacity-70">No listings yet.</p> : null}
            {listings.map((listing: any) => (
              <article key={listing.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                <p className="font-medium">
                  {listing.brand} {listing.title}
                </p>
                <p className="opacity-75">
                  {listing.category} | Size {listing.size}
                </p>
                <p className="opacity-75">
                  {listing.bookings.length} bookings | {listing.isAvailable ? "Available" : "Unavailable"} | {listing.featured ? "Approved" : "Pending approval"}
                </p>
                <SellerListingActions itemId={listing.id} isAvailable={listing.isAvailable} />
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-serif text-2xl">Payout settings</h2>
          <p className="mt-2 text-sm opacity-75">
            Connect Stripe payouts to receive transfers automatically after confirmed returns.
          </p>
          <div className="mt-4 rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
            Stripe Connect status: <span className="font-medium">Pending setup</span>
          </div>
          <button className="mt-4 rounded-lg bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black">Configure payouts</button>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="font-serif text-2xl">Orders and availability calendar</h2>
        <div className="mt-3 space-y-3 text-sm">
          {orders.length === 0 ? <p className="opacity-70">No orders yet.</p> : null}
          {orders.map((order: any) => (
            <article key={order.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
              <p className="font-medium">
                {order.item.brand} {order.item.title}
              </p>
              <p className="opacity-75">
                Buyer: {order.customer.name || order.customer.email} | {order.status}
              </p>
              <p className="opacity-75">
                {new Date(order.startDate).toLocaleDateString()} - {new Date(order.endDate).toLocaleDateString()}
              </p>
              <p className="opacity-75">
                {order.fulfillmentMethod || "Delivery choice pending"} | {order.paymentMethod || "Payment pending"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/messages?contact=${order.customerId}`} className="rounded-lg border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
                  Chat user
                </Link>
                <button className="rounded-lg border border-black/15 px-3 py-1.5 text-xs dark:border-white/20">Mark as delivered</button>
                <button className="rounded-lg border border-black/15 px-3 py-1.5 text-xs dark:border-white/20">Mark as returned</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
