import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/backend/lib/utils";
import { SellerListingActions } from "@/frontend/components/seller-listing-actions";
import { SellerBookingActions } from "@/frontend/components/seller-booking-actions";
import { BookingStatusBadge } from "@/frontend/components/booking-status-badge";

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
      include: {
        customer: { select: { name: true, email: true } },
        item: { select: { title: true, brand: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const grossRevenue = orders
    .filter((o: any) => ["CONFIRMED", "ACTIVE", "LATE", "COMPLETED"].includes(o.status))
    .reduce((acc: number, o: any) => acc + o.rentalAmount, 0);

  const payoutProjection = orders
    .filter((o: any) => ["CONFIRMED", "ACTIVE", "LATE", "COMPLETED"].includes(o.status))
    .reduce((acc: number, o: any) => acc + o.ownerPayoutAmount, 0);

  const pendingOrders = orders.filter((o: any) =>
    ["PENDING", "CONFIRMED", "ACTIVE", "LATE"].includes(o.status),
  );
  const pastOrders = orders.filter((o: any) =>
    ["COMPLETED", "CANCELED"].includes(o.status),
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-serif text-4xl">Seller Dashboard</h1>
      <p className="mt-2 text-sm opacity-70">
        Inventory, orders, and earnings overview.
      </p>

      {/* Stats */}
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {[
          { label: "Active listings", value: listings.length },
          { label: "Orders", value: orders.length },
          { label: "Gross revenue", value: formatCurrency(grossRevenue) },
          { label: "Projected payouts", value: formatCurrency(payoutProjection) },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-2xl border border-black/10 p-4 dark:border-white/10"
          >
            <p className="text-xs uppercase tracking-wide opacity-65">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Inventory */}
        <section className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl">Inventory</h2>
            <Link href="/list-item" className="text-sm underline opacity-75">
              Add listing
            </Link>
          </div>

          <div className="space-y-3 text-sm">
            {listings.length === 0 ? (
              <p className="opacity-70">No listings yet.</p>
            ) : null}

            {listings.map((listing: any) => (
              <article
                key={listing.id}
                className="rounded-xl border border-black/10 p-3 dark:border-white/10"
              >
                <div className="flex flex-wrap items-start justify-between gap-1">
                  <div>
                    <p className="font-medium">
                      {listing.brand} {listing.title}
                    </p>
                    <p className="opacity-65">
                      {listing.category} · Size {listing.size} ·{" "}
                      {listing.bookings.length} booking
                      {listing.bookings.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                      listing.featured
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                        : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300"
                    }`}
                  >
                    {listing.featured ? "Live" : "Pending approval"}
                  </span>
                </div>
                <SellerListingActions
                  itemId={listing.id}
                  isAvailable={listing.isAvailable}
                />
              </article>
            ))}
          </div>
        </section>

        {/* Payout settings */}
        <section className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-serif text-2xl">Payout settings</h2>
          <p className="mt-2 text-sm opacity-75">
            Connect Stripe payouts to receive transfers automatically after
            confirmed returns.
          </p>
          <div className="mt-4 rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
            Stripe Connect status:{" "}
            <span className="font-medium">Pending setup</span>
          </div>
          <button className="mt-4 rounded-lg bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black">
            Configure payouts
          </button>
        </section>
      </div>

      {/* Active orders */}
      <section className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="mb-4 font-serif text-2xl">Active orders</h2>

        <div className="space-y-3 text-sm">
          {pendingOrders.length === 0 ? (
            <p className="opacity-70">No active orders.</p>
          ) : null}

          {pendingOrders.map((order: any) => (
            <article
              key={order.id}
              className="rounded-xl border border-black/10 p-4 dark:border-white/10"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {order.item.brand} {order.item.title}
                  </p>
                  <p className="mt-0.5 opacity-70">
                    {order.customer.name || order.customer.email}
                  </p>
                  <p className="opacity-70">
                    {new Date(order.startDate).toLocaleDateString()} –{" "}
                    {new Date(order.endDate).toLocaleDateString()}
                  </p>
                  {order.fulfillmentMethod ? (
                    <p className="opacity-65">
                      {order.fulfillmentMethod === "DELIVERY"
                        ? "Delivery"
                        : "Pickup"}{" "}
                      · {order.paymentMethod ?? "Payment pending"}
                    </p>
                  ) : null}
                </div>
                <BookingStatusBadge status={order.status} />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/messages?contact=${order.customerId}`}
                  className="rounded-lg border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                >
                  Chat buyer
                </Link>
                <SellerBookingActions
                  bookingId={order.id}
                  status={order.status}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Past orders */}
      {pastOrders.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="mb-4 font-serif text-2xl">Past orders</h2>
          <div className="space-y-3 text-sm">
            {pastOrders.map((order: any) => (
              <article
                key={order.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10"
              >
                <div>
                  <p className="font-medium">
                    {order.item.brand} {order.item.title}
                  </p>
                  <p className="opacity-70">
                    {order.customer.name || order.customer.email}
                  </p>
                  <p className="opacity-70">
                    {new Date(order.startDate).toLocaleDateString()} –{" "}
                    {new Date(order.endDate).toLocaleDateString()}
                  </p>
                </div>
                <BookingStatusBadge status={order.status} />
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
