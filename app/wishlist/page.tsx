import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ItemCard } from "@/components/item-card";

export const dynamic = "force-dynamic";

type WishlistItem = Prisma.WishlistGetPayload<{
  include: {
    item: {
      include: {
        images: true;
        owner: { select: { role: true } };
        reviews: true;
      };
    };
  };
}>;

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const wishlist: WishlistItem[] = await prisma.wishlist.findMany({
    where: { userId: session.user.id },
    include: {
      item: {
        include: {
          images: true,
          owner: { select: { role: true } },
          reviews: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-serif text-4xl">Wishlist</h1>
      <p className="mt-2 text-sm opacity-70">Saved clothes you want to come back to, compare, and rent when the timing is right.</p>
      {wishlist.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-black/15 p-8 text-center text-sm opacity-75 dark:border-white/20">
          No saved clothes yet. Tap the heart on any listing to build your wishlist.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {wishlist.map((entry) => (
            <ItemCard key={entry.id} item={{ ...entry.item, isWishlisted: true }} />
          ))}
        </div>
      )}
    </main>
  );
}
