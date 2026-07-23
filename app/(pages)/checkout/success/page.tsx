import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const session = await auth();
  const params = await searchParams;
  const orderId = params.orderId;

  if (!session?.user || !orderId) {
    notFound();
  }

  const order = await prisma.purchase.findFirst({
    where: { id: orderId, buyerId: session.user.id },
  });

  if (!order) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 text-center md:px-8">
      <CheckCircle2 className="mx-auto size-16 text-emerald-500" />
      <h1 className="mt-6 font-serif text-3xl font-semibold text-black dark:text-white">Order Confirmed!</h1>
      <p className="mt-3 text-sm text-black/70 dark:text-white/70">
        Thank you for your purchase. Your order #{orderId} has been placed successfully.
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
