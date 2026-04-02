import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { RentalForm } from "@/components/rental-form";
import { ItemCard } from "@/components/item-card";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { PurchaseCheckoutButton } from "@/components/purchase-checkout-button";
import { WishlistButton } from "@/components/wishlist-button";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { databaseErrorMessage, isDatabaseUnavailable, logDatabaseIssue } from "@/lib/errors";
import { isPrismaUnknownFieldError } from "@/lib/prisma-compat";

export const dynamic = "force-dynamic";
const prismaAny = prisma as any;

type ItemDetails = Prisma.ItemGetPayload<{
  include: {
    images: { orderBy: { sortOrder: "asc" } };
    owner: { select: { id: true; name: true; image: true; role: true; email: true } };
    repairs: { orderBy: { createdAt: "desc" } };
    reviews: { orderBy: { createdAt: "desc" } };
    availabilityBlocks: true;
    bookings: {
      where: { status: { in: ["PENDING", "CONFIRMED", "ACTIVE", "LATE"] } };
      select: { startDate: true; endDate: true };
    };
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
  let isWishlisted = false;
  let profileDefaults: {
    preferredPaymentMethod?: "CARD" | "MPESA" | null;
    preferredFulfillmentMethod?: "DELIVERY" | "PICKUP" | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    country?: string | null;
    phone?: string | null;
  } | null = null;
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
        bookings: {
          where: { status: { in: ["PENDING", "CONFIRMED", "ACTIVE", "LATE"] } },
          select: { startDate: true, endDate: true },
        },
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
          const [cartEntry, wishlistEntry, profileEntry] = await Promise.all([
            prisma.cartItem.findUnique({
              where: {
                userId_itemId: {
                  userId: session.user.id,
                  itemId: item.id,
                },
              },
              select: { id: true },
            }),
            prisma.wishlist.findUnique({
              where: {
                userId_itemId: {
                  userId: session.user.id,
                  itemId: item.id,
                },
              },
              select: { id: true },
            }),
            (async () => {
              try {
                return await prismaAny.user.findUnique({
                  where: { id: session.user.id },
                  select: {
                    preferredPaymentMethod: true,
                    preferredFulfillmentMethod: true,
                    addressLine1: true,
                    addressLine2: true,
                    city: true,
                    country: true,
                    phone: true,
                  },
                });
              } catch (error) {
                if (!isPrismaUnknownFieldError(error)) throw error;
                return {
                  preferredPaymentMethod: null,
                  preferredFulfillmentMethod: null,
                  addressLine1: null,
                  addressLine2: null,
                  city: null,
                  country: null,
                  phone: null,
                };
              }
            })(),
          ]);
          inCart = Boolean(cartEntry);
          isWishlisted = Boolean(wishlistEntry);
          profileDefaults = profileEntry;
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
  const blockedRanges = [
    ...item.availabilityBlocks.map((block) => ({ startDate: block.startDate, endDate: block.endDate })),
    ...item.bookings.map((booking) => ({ startDate: booking.startDate, endDate: booking.endDate })),
  ];

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
                Buy instantly with Stripe Checkout or add it to your cart if you want to bundle a few pieces first.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <PurchaseCheckoutButton itemIds={[item.id]} source="item" className="w-full">
                  Buy now
                </PurchaseCheckoutButton>
                <AddToCartButton itemId={item.id} inCart={inCart} className="w-full rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black" />
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
            <h3 className="font-semibold">Quick actions</h3>
            <p className="mt-2 text-sm opacity-75">
              Save this piece, message the owner, or move straight into checkout when you are ready.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <WishlistButton itemId={item.id} initialWishlisted={isWishlisted} showLabel className="w-full justify-center rounded-lg" />
              <Link
                href={`/messages?contact=${item.owner.id}`}
                className="inline-flex items-center justify-center rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                Chat Owner
              </Link>
            </div>
          </section>

          <RentalForm itemId={item.id} defaults={profileDefaults ?? undefined} />

          <AvailabilityCalendar blockedRanges={blockedRanges} />

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
