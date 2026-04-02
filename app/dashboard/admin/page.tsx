import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { approveListingAction } from "@/app/actions/admin-actions";
import { AdminUserActions } from "@/components/admin-user-actions";

const prismaAny = prisma as any;

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [pendingListings, users, disputes, revenue, recentOrders] = await Promise.all([
    prismaAny.item.findMany({
      where: { featured: false },
      include: { owner: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prismaAny.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prismaAny.booking.findMany({
      where: { status: "LATE" },
      include: { item: { select: { title: true, brand: true } }, customer: { select: { email: true } } },
      orderBy: { updatedAt: "desc" },
      take: 12,
    }),
    prismaAny.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "COMMISSION" },
    }),
    prismaAny.booking.findMany({
      include: {
        item: { select: { title: true, brand: true } },
        customer: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-serif text-4xl">Admin Dashboard</h1>
      <p className="mt-2 text-sm opacity-70">Moderation, disputes, refunds, and platform health.</p>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="text-xs uppercase tracking-wide opacity-65">Pending approvals</p>
          <p className="mt-1 text-2xl font-semibold">{pendingListings.length}</p>
        </div>
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="text-xs uppercase tracking-wide opacity-65">Users</p>
          <p className="mt-1 text-2xl font-semibold">{users.length}</p>
        </div>
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="text-xs uppercase tracking-wide opacity-65">Open disputes</p>
          <p className="mt-1 text-2xl font-semibold">{disputes.length}</p>
        </div>
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="text-xs uppercase tracking-wide opacity-65">Platform revenue</p>
          <p className="mt-1 text-2xl font-semibold">{formatCurrency(revenue._sum.amount || 0)}</p>
        </div>
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-serif text-2xl">Approve listings</h2>
          <div className="mt-3 space-y-2 text-sm">
            {pendingListings.length === 0 ? <p className="opacity-70">No listings pending.</p> : null}
            {pendingListings.map((listing: any) => (
              <article key={listing.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                <p className="font-medium">
                  {listing.brand} {listing.title}
                </p>
                <p className="opacity-75">{listing.owner.name || listing.owner.email}</p>
                <form action={approveListingAction}>
                  <input type="hidden" name="listingId" value={listing.id} />
                  <button className="mt-2 rounded-lg bg-black px-3 py-1.5 text-xs text-white dark:bg-white dark:text-black">Approve</button>
                </form>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-serif text-2xl">User management</h2>
          <div className="mt-3 space-y-2 text-sm">
            {users.length === 0 ? <p className="opacity-70">No users found.</p> : null}
            {users.map((user: any) => (
              <article key={user.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                <p className="font-medium">{user.name || user.email}</p>
                <p className="opacity-75">
                  {user.email} | {user.role} | {user.isBanned ? "Banned" : "Active"}
                </p>
                <AdminUserActions userId={user.id} isBanned={Boolean(user.isBanned)} role={user.role} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-serif text-2xl">Orders</h2>
          <div className="mt-3 space-y-2 text-sm">
            {recentOrders.map((booking: any) => (
              <article key={booking.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                <p className="font-medium">
                  {booking.item.brand} {booking.item.title}
                </p>
                <p className="opacity-75">
                  {booking.customer.email} | {booking.status}
                </p>
                <p className="opacity-75">
                  {booking.fulfillmentMethod || "Fulfillment pending"} | {booking.paymentMethod || "Payment pending"}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-serif text-2xl">Payments & disputes</h2>
          <div className="mt-3 space-y-2 text-sm">
            {disputes.length === 0 ? <p className="opacity-70">No high-risk cases found.</p> : null}
            {disputes.map((booking: any) => (
              <article key={booking.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                <p className="font-medium">
                  {booking.item.brand} {booking.item.title}
                </p>
                <p className="opacity-75">
                  {booking.customer.email} | Status: {booking.status}
                </p>
              </article>
            ))}
          </div>
          <Link href="/admin" className="mt-4 inline-block text-sm underline opacity-80">
            Open repair and refund tools
          </Link>
        </div>
      </section>
    </main>
  );
}
