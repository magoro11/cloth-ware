import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function UserDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  if (session.user.role === "LENDER") redirect("/dashboard/seller");
  if (session.user.role === "ADMIN") redirect("/dashboard/admin");

  const [rentals, wishlist, activeReturns] = await Promise.all([
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
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-serif text-4xl">Buyer Dashboard</h1>
      <p className="mt-2 text-sm opacity-70">Manage rentals, purchases, payments, and return tracking.</p>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="text-xs uppercase tracking-wide opacity-65">My rentals</p>
          <p className="mt-1 text-2xl font-semibold">{rentals.length}</p>
        </div>
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="text-xs uppercase tracking-wide opacity-65">My purchases</p>
          <p className="mt-1 text-2xl font-semibold">0</p>
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
          <h2 className="font-serif text-2xl">Rental History</h2>
          <Link href="/marketplace" className="text-sm underline opacity-75">
            Rent more
          </Link>
        </div>
        <div className="space-y-3 text-sm">
          {rentals.length === 0 ? <p className="opacity-70">No rentals yet.</p> : null}
          {rentals.map((rental) => (
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
