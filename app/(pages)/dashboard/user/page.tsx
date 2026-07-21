import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/backend/lib/utils";
import { databaseErrorMessage, isDatabaseUnavailable, logDatabaseIssue } from "@/backend/lib/errors";
import { BookingStatusBadge } from "@/frontend/components/booking-status-badge";
import { CancelBookingButton } from "@/frontend/components/cancel-booking-button";
import { UpgradeRoleCard } from "@/components/upgrade-role-card";

export const dynamic = "force-dynamic";

type Rental = Prisma.BookingGetPayload<{
  include: { item: { select: { title: true; brand: true } } };
}>;

type WishlistEntry = Prisma.WishlistGetPayload<{
  include: { item: { include: { images: { take: 1 } } } };
}>;

type Purchase = Prisma.PurchaseGetPayload<{
  include: { item: { select: { title: true; brand: true } } };
}>;

export default async function UserDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  if (session.user.role === "LENDER") redirect("/dashboard/seller");
  if (session.user.role === "ADMIN") redirect("/dashboard/admin");

  let rentals: Rental[] = [];
  let wishlist: WishlistEntry[] = [];
  let activeReturns: Rental[] = [];
  let purchases: Purchase[] = [];
  let dbError = false;
  let dbErrorMessage = "Database is currently unavailable.";

  const purchaseDelegate = (
    prisma as typeof prisma & {
      purchase?: { findMany: (...args: unknown[]) => Promise<Purchase[]> };
    }
  ).purchase;

  try {
    [rentals, wishlist, activeReturns, purchases] = await Promise.all([
      prisma.booking.findMany({
        where: { customerId: session.user.id },
        include: { item: { select: { title: true, brand: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.wishlist.findMany({
        where: { userId: session.user.id },
        include: { item: { include: { images: { take: 1 } } } },
        take: 12,
        orderBy: { createdAt: "desc" },
      }),
      prisma.booking.findMany({
        where: {
          customerId: session.user.id,
          status: { in: ["ACTIVE", "LATE"] },
        },
        include: { item: { select: { title: true, brand: true } } },
        orderBy: { endDate: "asc" },
        take: 10,
      }),
      purchaseDelegate
        ? purchaseDelegate.findMany({
            where: { buyerId: session.user.id },
            include: { item: { select: { title: true, brand: true } } },
            orderBy: { createdAt: "desc" },
            take: 20,
          })
        : Promise.resolve([]),
    ]);
  } catch (error) {
    dbError = isDatabaseUnavailable(error);
    dbErrorMessage = databaseErrorMessage(error);
    logDatabaseIssue("UserDashboardPage database query failed", error);
  }

  const activeRentals = rentals.filter((r) =>
    ["PENDING", "CONFIRMED", "ACTIVE", "LATE"].includes(r.status),
  );
  const pastRentals = rentals.filter((r) =>
    ["COMPLETED", "CANCELED"].includes(r.status),
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-serif text-4xl">My Dashboard</h1>
      <p className="mt-2 text-sm opacity-70">
        Manage rentals, purchases, and your wishlist.
      </p>

      {dbError ? (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          {dbErrorMessage}
        </div>
      ) : null}

      {/* Stats */}
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {[
          { label: "My rentals", value: rentals.length },
          { label: "My purchases", value: purchases.length },
          { label: "Wishlist", value: wishlist.length },
          { label: "Open returns", value: activeReturns.length },
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

      {/* Active rentals */}
      <section className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Active rentals</h2>
          <Link href="/marketplace" className="text-sm underline opacity-75">
            Rent more
          </Link>
        </div>

        <div className="space-y-3 text-sm">
          {activeRentals.length === 0 ? (
            <p className="opacity-70">No active rentals right now.</p>
          ) : null}

          {activeRentals.map((rental) => (
            <article
              key={rental.id}
              className="rounded-xl border border-black/10 p-4 dark:border-white/10"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {rental.item.brand} {rental.item.title}
                  </p>
                  <p className="mt-0.5 opacity-70">
                    {new Date(rental.startDate).toLocaleDateString()} –{" "}
                    {new Date(rental.endDate).toLocaleDateString()}
                  </p>
                  <p className="mt-0.5 opacity-70">
                    Total:{" "}
                    {formatCurrency(rental.rentalAmount + rental.securityDeposit)}
                  </p>
                </div>
                <BookingStatusBadge status={rental.status} />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/messages`}
                  className="rounded-lg border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                >
                  Chat seller
                </Link>
                <Link
                  href={`/item/${rental.itemId}`}
                  className="rounded-lg border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                >
                  View listing
                </Link>
                <CancelBookingButton bookingId={rental.id} status={rental.status} />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Past rentals */}
      <section className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Past rentals</h2>
          <Link href="/wishlist" className="text-sm underline opacity-75">
            Open wishlist
          </Link>
        </div>

        <div className="space-y-3 text-sm">
          {pastRentals.length === 0 ? (
            <p className="opacity-70">No past rentals yet.</p>
          ) : null}

          {pastRentals.map((rental) => (
            <article
              key={rental.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10"
            >
              <div>
                <p className="font-medium">
                  {rental.item.brand} {rental.item.title}
                </p>
                <p className="mt-0.5 opacity-70">
                  {new Date(rental.startDate).toLocaleDateString()} –{" "}
                  {new Date(rental.endDate).toLocaleDateString()}
                </p>
                <p className="opacity-70">
                  {formatCurrency(rental.rentalAmount + rental.securityDeposit)}
                </p>
                {rental.status === "COMPLETED" ? (
                  <Link
                    href={`/item/${rental.itemId}`}
                    className="mt-2 inline-block text-xs underline opacity-70"
                  >
                    Leave a review
                  </Link>
                ) : null}
              </div>
              <BookingStatusBadge status={rental.status} />
            </article>
          ))}
        </div>
      </section>

      {/* Purchase history */}
      <section className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Purchase history</h2>
          <Link href="/cart" className="text-sm underline opacity-75">
            Open cart
          </Link>
        </div>

        <div className="space-y-3 text-sm">
          {purchases.length === 0 ? (
            <p className="opacity-70">No purchases yet.</p>
          ) : null}

          {purchases.map((purchase) => (
            <article
              key={purchase.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10"
            >
              <div>
                <p className="font-medium">
                  {purchase.item.brand} {purchase.item.title}
                </p>
                <p className="mt-0.5 opacity-70">
                  {new Date(purchase.createdAt).toLocaleDateString()}
                </p>
                <p className="opacity-70">{formatCurrency(purchase.amount)}</p>
              </div>
              <span className="inline-flex items-center rounded-full border border-black/10 px-2.5 py-0.5 text-[11px] font-medium dark:border-white/10">
                {purchase.status}
              </span>
            </article>
          ))}
        </div>
      </section>

      {/* Become a seller */}
      <section className="mt-8">
        <UpgradeRoleCard />
      </section>

      {/* Messages shortcut */}
      <section className="mt-6 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="font-serif text-2xl">Messages</h2>
        <p className="mt-2 text-sm opacity-75">
          Chat with sellers about fit, pickup, and return details.
        </p>
        <Link
          href="/messages"
          className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          Open inbox
        </Link>
      </section>
    </main>
  );
}
