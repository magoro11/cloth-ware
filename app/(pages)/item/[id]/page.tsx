import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/backend/lib/utils";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { WishlistButton } from "@/frontend/components/wishlist-button";
import { ItemCard } from "@/frontend/components/item-card";
import { Star, Truck, ShieldCheck, RefreshCcw } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaAny = prisma as any;

export const dynamic = "force-dynamic";

type ItemWithRelations = Prisma.ItemGetPayload<{
  include: { images: true; reviews: { include: { author: { select: { name: true } } } } };
}>;

type SearchParams = Promise<{
  q?: string;
  category?: string;
  sort?: string;
}>;

export default async function ProductDetailPage(props: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const params = await props.params;
  const session = await auth();

  let item: ItemWithRelations | null = null;
  let relatedItems: ItemWithRelations[] = [];
  let wishlisted = false;
  let inCart = false;

  try {
    item = await prismaAny.item.findUnique({
      where: { id: params.id },
      include: {
        images: true,
        reviews: { include: { author: { select: { name: true } } } },
      },
    });

    if (item) {
      const [related, wishlistEntry, cartEntry] = await Promise.all([
        prismaAny.item.findMany({
          where: { category: item.category, isAvailable: true, id: { not: item.id } },
          include: { images: true, reviews: true },
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
        session?.user
          ? prisma.wishlist.findFirst({ where: { userId: session.user.id, itemId: item.id } })
          : Promise.resolve(null),
        session?.user
          ? prisma.cartItem.findFirst({ where: { userId: session.user.id, itemId: item.id } })
          : Promise.resolve(null),
      ]);
      relatedItems = related;
      wishlisted = Boolean(wishlistEntry);
      inCart = Boolean(cartEntry);
    }
  } catch {
    item = null;
    relatedItems = [];
  }

  if (!item) {
    notFound();
  }

  const averageRating = item.reviews.length
    ? (item.reviews.reduce((acc, review) => acc + review.rating, 0) / item.reviews.length).toFixed(1)
    : null;

  const primaryImage = item.images.find((image) => image.url)?.url ?? null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <nav className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
        <Link href="/" className="hover:opacity-70">Home</Link>
        <span>/</span>
        <Link href="/marketplace" className="hover:opacity-70">Shop</Link>
        <span>/</span>
        <span className="text-black dark:text-white">{item.brand} {item.title}</span>
      </nav>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-black/5 bg-black/5 dark:border-white/10 dark:bg-white/5">
            {primaryImage ? (
              <Image src={primaryImage} alt={item.title} fill className="object-cover" unoptimized />
            ) : (
              <div className="grid h-full place-content-center text-sm opacity-60">No image</div>
            )}
            <div className="absolute right-3 top-3">
              <WishlistButton itemId={item.id} initialWishlisted={wishlisted} className="rounded-full bg-white/90 p-2 backdrop-blur dark:bg-black/60" />
            </div>
          </div>

          {item.images.length > 1 ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {item.images.map((image) => (
                <div key={image.id} className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                  {image.url ? (
                    <Image src={image.url} alt={item.title} fill className="object-cover" unoptimized />
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-60">{item.brand}</p>
            <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-black dark:text-white">{item.title}</h1>
            <div className="mt-2 flex items-center gap-2 text-sm">
              {averageRating ? (
                <span className="flex items-center gap-1 rounded bg-[#ffbf00] px-1.5 py-0.5 text-white">
                  <Star className="size-3 fill-white" />
                  {averageRating}
                </span>
              ) : null}
              <span className="text-black/50 dark:text-white/50">({item.reviews.length} review{item.reviews.length !== 1 ? "s" : ""})</span>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 p-4 dark:border-white/10">
            <p className="text-xs font-medium text-black/60 dark:text-white/60">Price</p>
            <p className="mt-1 text-3xl font-bold text-[#c25e30]">{formatCurrency(item.sellingPrice ?? 0)}</p>
            {item.rentalPricePerDay ? (
              <p className="mt-1 text-xs text-black/60 dark:text-white/60">Rental also available: {formatCurrency(item.rentalPricePerDay)}/day</p>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-black/5 p-3 text-center dark:border-white/10">
              <Truck className="mx-auto size-5 text-black/60 dark:text-white/60" />
              <p className="mt-1 text-xs font-medium">Free Delivery</p>
            </div>
            <div className="rounded-xl border border-black/5 p-3 text-center dark:border-white/10">
              <ShieldCheck className="mx-auto size-5 text-black/60 dark:text-white/60" />
              <p className="mt-1 text-xs font-medium">Secure Checkout</p>
            </div>
            <div className="rounded-xl border border-black/5 p-3 text-center dark:border-white/10">
              <RefreshCcw className="mx-auto size-5 text-black/60 dark:text-white/60" />
              <p className="mt-1 text-xs font-medium">30-Day Returns</p>
            </div>
          </div>

          <div className="space-y-3">
            <AddToCartButton itemId={item.id} inCart={inCart} className="w-full rounded-xl bg-[#F68B1E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#e07d18]" />
            <Link href="/cart" className="block w-full rounded-xl border border-black/10 px-4 py-3 text-center text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
              View Cart
            </Link>
          </div>

          <div className="rounded-2xl border border-black/5 p-4 dark:border-white/10">
            <h3 className="text-sm font-semibold text-black dark:text-white">Product Details</h3>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-black/60 dark:text-white/60">Category</dt>
                <dd className="font-medium text-black dark:text-white">{item.category}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-black/60 dark:text-white/60">Brand</dt>
                <dd className="font-medium text-black dark:text-white">{item.brand}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-black/60 dark:text-white/60">Size</dt>
                <dd className="font-medium text-black dark:text-white">{item.size}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-black/60 dark:text-white/60">Condition</dt>
                <dd className="font-medium text-black dark:text-white">{item.condition}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-black/5 p-4 dark:border-white/10">
            <h3 className="text-sm font-semibold text-black dark:text-white">Description</h3>
            <p className="mt-2 text-xs leading-6 text-black/70 dark:text-white/70">{item.description}</p>
          </div>
        </div>
      </div>

      {relatedItems.length > 0 ? (
        <section className="mt-14">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Related Products</h2>
            <Link href={`/marketplace?category=${encodeURIComponent(item.category)}`} className="text-sm font-semibold text-[#c25e30] hover:opacity-70">See All</Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {relatedItems.map((related) => (
              <ItemCard key={related.id} item={related} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
