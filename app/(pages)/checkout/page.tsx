import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/backend/lib/utils";
import { CartList } from "@/frontend/components/cart-list";
import { CheckoutForm } from "@/frontend/components/checkout-form";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const cartItems = await prisma.cartItem.findMany({
    where: { cart: { userId: session.user.id } },
    include: {
      product: {
        include: {
          images: { take: 1, orderBy: { sortOrder: "asc" } },
          brand: true,
        },
      },
      variant: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const mappedItems = cartItems.map((entry) => ({
    id: entry.id,
    productId: entry.productId,
      product: {
        id: entry.product.id,
        title: entry.product.title,
        brand: entry.product.brand?.name ?? "",
        basePrice: entry.product.basePrice,
        images: entry.product.images,
      },
    variantId: entry.variantId,
    quantity: entry.quantity,
  }));

  const subtotal = mappedItems.reduce((sum, entry) => sum + (entry.product.basePrice ?? 0) * entry.quantity, 0);
  const shipping = subtotal >= 100 ? 0 : 15;
  const total = subtotal + shipping;

  if (mappedItems.length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="rounded-2xl border border-dashed border-black/15 p-8 text-center">
          <p className="text-sm opacity-75">Your cart is empty.</p>
          <Link href="/marketplace" className="mt-4 inline-flex rounded-lg bg-[#F68B1E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e07d18]">
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-sans text-3xl font-bold tracking-tight text-black dark:text-white">Checkout</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">Review your order and complete payment.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,380px]">
        <div className="space-y-6">
          <CheckoutForm total={total} />
        </div>

        <aside className="h-fit rounded-2xl border border-black/5 p-5 dark:border-white/10">
          <h2 className="font-semibold text-black dark:text-white">Order Summary</h2>
          <div className="mt-4 space-y-3">
            <CartList initialItems={mappedItems} />
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-black/70 dark:text-white/70">Subtotal</span>
              <span className="font-medium text-black dark:text-white">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-black/70 dark:text-white/70">Shipping</span>
              <span className="font-medium text-black dark:text-white">{shipping === 0 ? "Free" : formatCurrency(shipping)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-black/10 pt-2 dark:border-white/10">
              <span className="font-semibold text-black dark:text-white">Total</span>
              <span className="text-lg font-bold text-[#c25e30]">{formatCurrency(total)}</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-black/50 dark:text-white/50">Secure checkout powered by Stripe, M-Pesa, and PayPal.</p>
        </aside>
      </div>
    </main>
  );
}
