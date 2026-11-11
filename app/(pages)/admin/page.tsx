import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/backend/lib/utils";
import { databaseErrorMessage, isDatabaseUnavailable, logDatabaseIssue } from "@/backend/lib/errors";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  let recentOrders: any[] = [];
  let dbError = false;
  let dbErrorMessage = "Database is currently unavailable.";

  try {
    recentOrders = await prisma.order.findMany({
      include: {
        user: { select: { name: true, email: true } },
        subOrders: {
          include: {
            vendor: { select: { businessName: true } },
            items: { include: { product: { select: { title: true, brand: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
  } catch (error) {
    dbError = isDatabaseUnavailable(error);
    dbErrorMessage = databaseErrorMessage(error);
    logDatabaseIssue("AdminPage database query failed", error);
  }

  if (dbError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          {dbErrorMessage} Please check <code>DATABASE_URL</code> in Vercel and confirm the database is online.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-serif text-4xl">Admin panel</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-serif text-2xl">Recent orders</h2>
          <div className="mt-3 space-y-3 text-sm">
            {recentOrders.map((order) => (
              <div key={order.id} className="rounded-lg border border-black/10 p-3 dark:border-white/10">
                <p className="font-medium">{order.orderNumber}</p>
                <p className="opacity-70">
                  {order.user?.name ?? order.user?.email} • {order.status}
                </p>
                <p>{formatCurrency(order.total)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
