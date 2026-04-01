import Image from "next/image";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { RentalForm } from "@/components/rental-form";
import { ItemCard } from "@/components/item-card";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { databaseErrorMessage, isDatabaseUnavailable, logDatabaseIssue } from "@/lib/errors";

export const dynamic = "force-dynamic";

type ItemDetails = Prisma.ItemGetPayload<{
  include: {
    images: { orderBy: { sortOrder: "asc" } };
    owner: { select: { id: true; name: true; image: true; role: true; email: true } };
    repairs: { orderBy: { createdAt: "desc" } };
    reviews: { orderBy: { createdAt: "desc" } };
    availabilityBlocks: true;
  };
}>;

type SimilarItem = Prisma.ItemGetPayload<{
  include: { images: true; owner: { select: { role: true } }; reviews: true };
}>;

type Params = Promise<{ id: string }>;

export default async function ItemDetailsPage(props: { params: Params }) {
  const session = await auth();
  const { id } = await props.params;
  let item: ItemDetails | null = null;
  let similarItems: SimilarItem[] = [];
  let inCart = false;
  let dbError = false;
  let dbErrorMessage = "Database is currently unavailable.";

  try {
    item = await prisma.item.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        owner: { select: { id: true, name: true, image: true, role: true, email: true } },
        repairs: { orderBy: { createdAt: "desc" } },
        reviews: { orderBy: { createdAt: "desc" } },
        availabilityBlocks: true,
      },
    });

    if (item) {
      if (!item.featured && item.owner.id !== session?.user?.id && session?.user?.role !== "ADMIN") {
        return notFound();
      }

      similarItems = await prisma.item.findMany({
        where: { id: { not: item.id }, category: item.category, featured: true },
        include: { images: true, owner: { select: { role: true } }, reviews: true },
        orderBy: { createdAt: "desc" },
        take: 4,
      });

      if (session?.user) {
        try {
          inCart = Boolean(
            await prisma.cartItem.findUnique({
              where: {
                userId_itemId: {
                  userId: session.user.id,
                  itemId: item.id,
                },
              },
              select: { id: true },
            }),
          );
        } catch (error) {
          logDatabaseIssue("ItemDetailsPage cart query failed", error);
        }
      }
    }
  } catch (error) {
    dbError = isDatabaseUnavailable(error);
    dbErrorMessage = databaseErrorMessage(error);
    logDatabaseIssue("ItemDetailsPage database query failed", error);
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
  if (!item) return notFound();

  const avgRating = item.reviews.length
    ? (item.reviews.reduce((acc, review) => acc + review.rating, 0) / item.reviews.length).toFixed(1)
    : "New";

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="grid gap-8 md:grid-cols-2">
        <section className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
            {item.images[0]?.url ? (
              <Image
                src={item.images[0].url}
                alt={item.title}
                width={1200}
                height={1500}
                unoptimized
                className="aspect-[4/5] w-full object-cover"
              />
            ) : (
              <div className="grid aspect-[4/5] place-content-center">No image</div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {item.images.slice(1, 5).map((image) => (
              <Image
                key={image.id}
                src={image.url}
                alt=""
                width={400}
                height={400}
                unoptimized
                className="aspect-square rounded-lg object-cover"
              />
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div>
            <p className="text-sm uppercase tracking-widest opacity-70">{item.brand}</p>
            <h1 className="font-serif text-4xl">{item.title}</h1>
            <p className="mt-3 text-sm opacity-80">{item.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-black/10 p-4 text-sm dark:border-white/10">
            <p>Category: {item.category}</p>
            <p>Size: {item.size}</p>
            <p>Condition: {item.condition}</p>
            <p>Rating: {avgRating}</p>
            <p>Rent/day: {formatCurrency(item.rentalPricePerDay)}</p>
            <p>Deposit: {formatCurrency(item.securityDeposit)}</p>
            {item.sellingPrice ? <p>Buy now: {formatCurrency(item.sellingPrice)}</p> : null}
            <p>Verified seller: {item.owner.role === "LENDER" || item.owner.role === "ADMIN" ? "Yes" : "Pending"}</p>
          </div>

          {item.sellingPrice ? (
            <section className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
              <h3 className="font-semibold">Buy this item</h3>
              <p className="mt-2 text-sm opacity-75">
                Add it to your cart and keep shopping. Purchase checkout can be layered in next.
              </p>
              <div className="mt-4">
                <AddToCartButton itemId={item.id} inCart={inCart} className="w-full rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black" />
              </div>
            </section>
          ) : null}

          <RentalForm itemId={item.id} />

          <section className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <h2 className="font-semibold">Seller information</h2>
            <p className="mt-2 text-sm opacity-80">{item.owner.name || "Luxury seller"}</p>
            <p className="text-sm opacity-65">{item.owner.email}</p>
          </section>

          <section className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <h2 className="font-semibold">Damage policy</h2>
            <p className="mt-2 text-sm opacity-80">
              Deposits are held until return inspection. Approved repair deductions are logged transparently and shared in your dashboard.
            </p>
          </section>

          <section className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <h2 className="font-semibold">Return instructions</h2>
            <p className="mt-2 text-sm opacity-80">
              Return by the end date in clean condition. Late returns may incur a per-day late fee based on listing policy.
            </p>
          </section>
        </section>
      </div>

      <section className="mt-10 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="font-serif text-2xl">Reviews & Ratings</h2>
        <div className="mt-3 space-y-3 text-sm">
          {item.reviews.length === 0 ? <p className="opacity-70">No reviews yet.</p> : null}
          {item.reviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
              <p className="font-medium">{review.rating}/5 stars</p>
              <p className="mt-1 opacity-80">{review.comment}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">Similar items</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {similarItems.map((similarItem) => (
            <ItemCard key={similarItem.id} item={similarItem} />
          ))}
        </div>
      </section>
    </main>
  );
}
