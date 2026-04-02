import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { databaseErrorMessage, isDatabaseUnavailable, logDatabaseIssue } from "@/lib/errors";

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
  const purchaseDelegate = (prisma as typeof prisma & {
    purchase?: {
      findMany: (...args: unknown[]) => Promise<Purchase[]>;
    };
  }).purchase;

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
        where: { customerId: session.user.id, status: { in: ["ACTIVE", "LATE"] } },
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

  const activeRentals = rentals.filter((rental) => ["PENDING", "CONFIRMED", "ACTIVE", "LATE"].includes(rental.status));
  const pastRentals = rentals.filter((rental) => ["COMPLETED", "CANCELED"].includes(rental.status));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-serif text-4xl">My Orders</h1>
      <p className="mt-2 text-sm opacity-70">Manage rentals, purchases, payments, and return tracking.</p>
      {dbError ? (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          {dbErrorMessage} If you just added purchase checkout, run <code>npm run db:push</code> to create the purchase table.
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="text-xs uppercase tracking-wide opacity-65">My rentals</p>
          <p className="mt-1 text-2xl font-semibold">{rentals.length}</p>
        </div>
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="text-xs uppercase tracking-wide opacity-65">My purchases</p>
          <p className="mt-1 text-2xl font-semibold">{purchases.length}</p>
        </div>
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="text-xs uppercase tracking-wide opacity-65">Wishlist</p>
          <p className="mt-1 text-2xl font-semibold">{wishlist.length}</p>
        </div>
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="text-xs uppercase tracking-wide opacity-65">Open returns</p>
          <p className="mt-1 text-2xl font-semibold">{activeReturns.length}</p>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Active rentals</h2>
          <Link href="/marketplace" className="text-sm underline opacity-75">
            Rent more
          </Link>
        </div>
        <div className="space-y-3 text-sm">
          {activeRentals.length === 0 ? <p className="opacity-70">No active rentals right now.</p> : null}
          {activeRentals.map((rental) => (
            <article key={rental.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
              <p className="font-medium">
                {rental.item.brand} {rental.item.title}
              </p>
              <p className="opacity-75">
                {new Date(rental.startDate).toLocaleDateString()} - {new Date(rental.endDate).toLocaleDateString()} | {rental.status}
              </p>
              <p>Total: {formatCurrency(rental.rentalAmount + rental.securityDeposit)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/messages" className="rounded-lg border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
                  Track order
                </Link>
                <Link href={`/item/${rental.itemId}`} className="rounded-lg border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
                  Extend rental
                </Link>
                <Link href="/messages" className="rounded-lg border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
                  Cancel booking
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Past rentals</h2>
          <Link href="/wishlist" className="text-sm underline opacity-75">
            Open wishlist
          </Link>
        </div>
        <div className="space-y-3 text-sm">
          {pastRentals.length === 0 ? <p className="opacity-70">No past rentals yet.</p> : null}
          {pastRentals.map((rental) => (
            <article key={rental.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
              <p className="font-medium">
                {rental.item.brand} {rental.item.title}
              </p>
              <p className="opacity-75">
                {new Date(rental.startDate).toLocaleDateString()} - {new Date(rental.endDate).toLocaleDateString()} | {rental.status}
              </p>
              <p>Total: {formatCurrency(rental.rentalAmount + rental.securityDeposit)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Purchase History</h2>
          <Link href="/cart" className="text-sm underline opacity-75">
            Open cart
          </Link>
        </div>
        <div className="space-y-3 text-sm">
          {purchases.length === 0 ? <p className="opacity-70">No purchases yet.</p> : null}
          {purchases.map((purchase) => (
            <article key={purchase.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
              <p className="font-medium">
                {purchase.item.brand} {purchase.item.title}
              </p>
              <p className="opacity-75">
                {new Date(purchase.createdAt).toLocaleDateString()} | {purchase.status}
              </p>
              <p>Total: {formatCurrency(purchase.amount)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-serif text-2xl">Saved Payment Methods</h2>
          <p className="mt-2 text-sm opacity-75">Managed securely by Stripe Checkout. Add cards during checkout flow.</p>
        </div>
        <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-serif text-2xl">Messages</h2>
          <p className="mt-2 text-sm opacity-75">Chat with sellers about fit, pickup, and return details.</p>
          <Link href="/messages" className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black">
            Open inbox
          </Link>
        </div>
      </section>
    </main>
  );
}
