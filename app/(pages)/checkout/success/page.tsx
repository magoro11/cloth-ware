import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ orderId?: string; pending?: string }> }) {
  const session = await auth();
  const params = await searchParams;
  const orderId = params.orderId;
  const isPending = params.pending === "true";

  if (!session?.user || !orderId) {
    notFound();
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id },
    include: { payments: true, subOrders: true },
  });

  if (!order) {
    notFound();
  }

  const payment = order.payments[0];
  const isPaid = order.status === "PAID" || payment?.status === "SUCCEEDED";
  const isPendingPayment = order.status === "PENDING" || payment?.status === "PENDING" || isPending;

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 text-center md:px-8">
      {isPaid ? (
        <CheckCircle2 className="mx-auto size-16 text-emerald-500" />
      ) : isPendingPayment ? (
        <Clock className="mx-auto size-16 text-amber-500" />
      ) : (
        <AlertCircle className="mx-auto size-16 text-rose-500" />
      )}
      <h1 className="mt-6 font-serif text-3xl font-semibold text-black dark:text-white">
        {isPaid ? "Order Confirmed!" : isPendingPayment ? "Payment Pending" : "Payment Failed"}
      </h1>
      <p className="mt-3 text-sm text-black/70 dark:text-white/70">
        {isPaid
          ? `Thank you for your purchase. Your order #${orderId} has been placed successfully.`
          : isPendingPayment
          ? "Your payment is being processed. You will receive a confirmation once it's complete."
          : "There was an issue with your payment. Please try again or contact support."}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/marketplace" className="rounded-lg bg-[#F68B1E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e07d18]">
          Continue Shopping
        </Link>
        <Link href="/dashboard/user" className="rounded-lg border border-black/10 px-5 py-2.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
          View Orders
        </Link>
      </div>
    </main>
  );
}
