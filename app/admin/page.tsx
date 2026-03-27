import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminRepairForm } from "@/components/admin-repair-form";
import { formatCurrency } from "@/lib/utils";
import { databaseErrorMessage, isDatabaseUnavailable, logDatabaseIssue } from "@/lib/errors";

export const dynamic = "force-dynamic";

type RecentBooking = Prisma.BookingGetPayload<{
  include: {
    item: { select: { title: true; brand: true } };
    customer: { select: { email: true } };
  };
}>;

type RepairWithItem = Prisma.RepairLogGetPayload<{
  include: {
    item: { select: { title: true; brand: true } };
  };
}>;

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  let recentBookings: RecentBooking[] = [];
  let repairs: RepairWithItem[] = [];
  let dbError = false;
  let dbErrorMessage = "Database is currently unavailable.";

  try {
    [recentBookings, repairs] = await Promise.all([
      prisma.booking.findMany({
        include: { item: { select: { title: true, brand: true } }, customer: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.repairLog.findMany({
        include: { item: { select: { title: true, brand: true } } },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
    ]);
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
        <AdminRepairForm />
        <section className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-serif text-2xl">Recent bookings</h2>
          <div className="mt-3 space-y-3 text-sm">
            {recentBookings.map((booking) => (
              <div key={booking.id} className="rounded-lg border border-black/10 p-3 dark:border-white/10">
                <p className="font-medium">
                  {booking.item.brand} {booking.item.title}
                </p>
                <p className="opacity-70">
                  {booking.customer.email} • {booking.status}
                </p>
                <p>
                  Rental: {formatCurrency(booking.rentalAmount)} • Deposit: {formatCurrency(booking.securityDeposit)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="font-serif text-2xl">Maintenance history</h2>
        <div className="mt-3 space-y-2 text-sm">
          {repairs.length === 0 ? <p className="opacity-70">No repairs logged.</p> : null}
          {repairs.map((repair) => (
            <p key={repair.id}>
              {new Date(repair.createdAt).toLocaleDateString()} - {repair.item.brand} {repair.item.title}: {formatCurrency(repair.repairCost)} ({repair.adminNote})
            </p>
          ))}
        </div>
      </section>
    </main>
  );
}
