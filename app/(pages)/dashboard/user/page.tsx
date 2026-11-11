import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/backend/lib/utils";
import { databaseErrorMessage, isDatabaseUnavailable, logDatabaseIssue } from "@/backend/lib/errors";

export const dynamic = "force-dynamic";

type WishlistEntry = Prisma.WishlistItemGetPayload<{
  include: { product: { include: { images: { take: 1 }, brand: true } } };
}>;

export default async function UserDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  if (session.user.role === "LENDER") redirect("/dashboard/seller");
  if (session.user.role === "ADMIN") redirect("/dashboard/admin");

  let orders: any[] = [];
  let wishlist: WishlistEntry[] = [];
  let returnRequests: any[] = [];
  let dbError = false;
  let dbErrorMessage = "Database is currently unavailable.";

  try {
    [orders, wishlist, returnRequests] = await Promise.all([
      prisma.order.findMany({
        where: { userId: session.user.id },
        include: {
          subOrders: {
            include: {
              items: { include: { product: { select: { title: true, brand: true } } } },
              vendor: { select: { businessName: true } },
            },
          },
          payments: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.wishlistItem.findMany({
        where: { userId: session.user.id },
        include: { product: { include: { images: { take: 1 }, brand: true } } },
        take: 12,
        orderBy: { createdAt: "desc" },
      }),
      prisma.returnRequest.findMany({
        where: { userId: session.user.id },
        include: {
          order: { select: { orderNumber: true } },
          subOrder: { select: { subOrderNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);
  } catch (error) {
    dbError = isDatabaseUnavailable(error);
    dbErrorMessage = databaseErrorMessage(error);
    logDatabaseIssue("UserDashboardPage database query failed", error);
  }

  const activeOrders = orders.filter((o) =>
    ["PENDING", "PAID", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY"].includes(o.status),
  );
  const pastOrders = orders.filter((o) =>
    ["DELIVERED", "CANCELED", "REFUNDED"].includes(o.status),
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-serif text-4xl">My Dashboard</h1>
      <p className="mt-2 text-sm opacity-70">
        Manage orders, returns, and your wishlist.
      </p>

      {dbError ? (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          {dbErrorMessage}
        </div>
      ) : null}

      {/* Stats */}
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {[
          { label: "My orders", value: orders.length },
          { label: "Active orders", value: activeOrders.length },
          { label: "Wishlist", value: wishlist.length },
          { label: "Return requests", value: returnRequests.length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <p className="text-xs uppercase tracking-wide opacity-65">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {/* Active orders */}
      <section className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Active orders</h2>
          <Link href="/marketplace" className="text-sm underline opacity-75">
            Shop more
          </Link>
        </div>

        <div className="space-y-3 text-sm">
          {activeOrders.length === 0 ? (
            <p className="opacity-70">No active orders right now.</p>
          ) : null}

          {activeOrders.map((order) => {
            const allItems = order.subOrders.flatMap((so: any) => so.items);
            return (
              <article key={order.id} className="rounded-xl border border-black/10 p-4 dark:border-white/10">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">Order {order.orderNumber}</p>
                    <p className="mt-0.5 opacity-70">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                    <p className="mt-0.5 opacity-70">
                      Total: {formatCurrency(order.total)}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                    order.status === "DELIVERED" ? "border-emerald-200 bg-emerald-50 text-emerald-800" :
                    order.status === "CANCELED" ? "border-rose-200 bg-rose-50 text-rose-800" :
                    "border-black/10 bg-black/5 text-black/60 dark:border-white/20 dark:bg-white/5 dark:text-white/60"
                  } dark:border-white/10`}>
                    {order.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/account/orders/${order.id}`} className="rounded-lg border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
                    View order
                  </Link>
                  {order.status === "DELIVERED" && (
                    <Link href={`/account/reviews`} className="rounded-lg border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
                      Write a review
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Past orders */}
      <section className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Past orders</h2>
          <Link href="/account/orders" className="text-sm underline opacity-75">
            View all orders
          </Link>
        </div>

        <div className="space-y-3 text-sm">
          {pastOrders.length === 0 ? (
            <p className="opacity-70">No past orders yet.</p>
          ) : null}

          {pastOrders.map((order) => {
            const allItems = order.subOrders.flatMap((so: any) => so.items);
            return (
              <article key={order.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10">
                <div>
                  <p className="font-medium">Order {order.orderNumber}</p>
                  <p className="mt-0.5 opacity-70">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                  <p className="opacity-70">{formatCurrency(order.total)}</p>
                </div>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                  order.status === "DELIVERED" ? "border-emerald-200 bg-emerald-50 text-emerald-800" :
                  order.status === "CANCELED" ? "border-rose-200 bg-rose-50 text-rose-800" :
                  "border-black/10 bg-black/5 text-black/60 dark:border-white/20 dark:bg-white/5 dark:text-white/60"
                } dark:border-white/10`}>
                  {order.status}
                </span>
              </article>
            );
          })}
        </div>
      </section>

      {/* Return requests */}
      <section className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Return requests</h2>
        </div>

        <div className="space-y-3 text-sm">
          {returnRequests.length === 0 ? (
            <p className="opacity-70">No return requests.</p>
          ) : null}

          {returnRequests.map((req) => (
            <article key={req.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
              <p className="font-medium">Order {req.order.orderNumber}</p>
              <p className="opacity-75">{req.subOrder?.subOrderNumber ?? "Full order"} · {req.reason}</p>
              <p className="text-xs opacity-60 mt-1">Status: {req.status}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Wishlist */}
      <section className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Wishlist</h2>
          <Link href="/account/wishlist" className="text-sm underline opacity-75">
            View wishlist
          </Link>
        </div>

        <div className="space-y-3 text-sm">
          {wishlist.length === 0 ? (
            <p className="opacity-70">Your wishlist is empty.</p>
          ) : null}

          {wishlist.slice(0, 6).map((item) => (
            <article key={item.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-black/10 p-3 dark:border-white/10">
              <div>
                <p className="font-medium">{item.product.title}</p>
                <p className="mt-0.5 opacity-70">{item.product.brand?.name ?? ""}</p>
              </div>
            </article>
          ))}
        </div>
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
