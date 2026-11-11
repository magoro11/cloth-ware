import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/frontend/components/product-card";

export const dynamic = "force-dynamic";

type WishlistEntry = Prisma.WishlistItemGetPayload<{
  include: { product: { include: { images: { take: 1 }, brand: true } } };
}>;

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const wishlist: WishlistEntry[] = await prisma.wishlistItem.findMany({
    where: { userId: session.user.id },
    include: { product: { include: { images: { take: 1 }, brand: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-serif text-4xl">Wishlist</h1>
      <p className="mt-2 text-sm opacity-70">Saved products you want to come back to.</p>
      {wishlist.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-black/15 p-8 text-center text-sm opacity-75 dark:border-white/20">
          No saved products yet. Tap the heart on any product to build your wishlist.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {wishlist.map((entry) => (
            <ProductCard
              key={entry.id}
              product={{
                id: entry.product.id,
                title: entry.product.title,
                brand: entry.product.brand?.name ?? "",
                images: entry.product.images,
                variants: [],
                basePrice: entry.product.basePrice,
                isWishlisted: true,
              }}
            />
          ))}
        </div>
      )}
    </main>
  );
}
