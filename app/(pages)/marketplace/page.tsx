import { Prisma } from "@prisma/client";
import Link from "next/link";
import { Search } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORIES, FEATURED_BRANDS } from "@/lib/constants";
import { ItemCard } from "@/frontend/components/item-card";
import { databaseErrorMessage, isDatabaseUnavailable, logDatabaseIssue } from "@/backend/lib/errors";
import { isPrismaUnknownFieldError } from "@/lib/prisma-compat";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaAny = prisma as any;

export const dynamic = "force-dynamic";
export const revalidate = 60;

type ItemWithRelations = Prisma.ItemGetPayload<{
  include: {
    images: true;
    owner: { select: { role: true } };
    reviews: true;
  };
}>;

type SearchParams = Promise<{
  category?: string;
  size?: string;
  brand?: string;
  q?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: "latest" | "price_asc" | "price_desc" | "popularity";
  page?: string;
}>;

const PAGE_SIZE = 12;

function buildPageHref(searchParams: Awaited<SearchParams>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) params.set(key, value);
  }
  params.set("page", String(page));
  return `?${params.toString()}`;
}

export default async function MarketplacePage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const session = await auth();

  const page = Math.max(1, Number(searchParams.page || "1"));
  const skip = (page - 1) * PAGE_SIZE;

  const orderBy =
    searchParams.sort === "price_asc"
      ? ({ sellingPrice: "asc" } as const)
      : searchParams.sort === "price_desc"
        ? ({ sellingPrice: "desc" } as const)
        : searchParams.sort === "popularity"
          ? ({ reviews: { _count: "desc" } } as const)
          : ({ createdAt: "desc" } as const);

  let items: ItemWithRelations[] = [];
  let total = 0;
  let wishlistedIds = new Set<string>();
  let cartItemIds = new Set<string>();
  let dbError = false;
  let dbErrorMessage = "Database is currently unavailable.";

  try {
    const where: Prisma.ItemWhereInput = {
      featured: true,
      isAvailable: true,
      category: searchParams.category || undefined,
      size: searchParams.size || undefined,
      brand: searchParams.brand || undefined,
      sellingPrice: searchParams.minPrice || searchParams.maxPrice
        ? {
            gte: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
            lte: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
          }
        : undefined,
      OR: searchParams.q
        ? [
            { title: { contains: searchParams.q, mode: "insensitive" } },
            { brand: { contains: searchParams.q, mode: "insensitive" } },
            { description: { contains: searchParams.q, mode: "insensitive" } },
          ]
        : undefined,
    };

    let itemRows;
    let count;
    let wishlist;
    try {
      [itemRows, count, wishlist] = await Promise.all([
        prismaAny.item.findMany({
          where,
          include: {
            images: true,
            owner: { select: { role: true } },
            reviews: true,
          },
          orderBy,
          skip,
          take: PAGE_SIZE,
        }),
        prismaAny.item.count({ where }),
        session?.user
          ? prisma.wishlist.findMany({ where: { userId: session.user.id }, select: { itemId: true } })
          : Promise.resolve([]),
      ]);
    } catch (error) {
      if (!isPrismaUnknownFieldError(error)) throw error;
      const legacyWhere = { ...where };
      delete legacyWhere.isAvailable;
      delete legacyWhere.AND;
      [itemRows, count, wishlist] = await Promise.all([
        prismaAny.item.findMany({
          where: legacyWhere,
          include: {
            images: true,
            owner: { select: { role: true } },
            reviews: true,
          },
          orderBy: searchParams.sort === "popularity" ? { createdAt: "desc" } : orderBy,
          skip,
          take: PAGE_SIZE,
        }),
        prismaAny.item.count({ where: legacyWhere }),
        session?.user
          ? prisma.wishlist.findMany({ where: { userId: session.user.id }, select: { itemId: true } })
          : Promise.resolve([]),
      ]);
    }

    items = itemRows;
    total = count;
    wishlistedIds = new Set(wishlist.map((entry) => entry.itemId));

    if (session?.user) {
      try {
        const cartItems = await prisma.cartItem.findMany({
          where: { userId: session.user.id },
          select: { itemId: true },
        });
        cartItemIds = new Set(cartItems.map((entry) => entry.itemId));
      } catch (error) {
        logDatabaseIssue("MarketplacePage cart query failed", error);
      }
    }
  } catch (error) {
    dbError = isDatabaseUnavailable(error);
    dbErrorMessage = databaseErrorMessage(error);
    logDatabaseIssue("MarketplacePage database query failed", error);
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      {dbError ? (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          {dbErrorMessage} Please check <code>DATABASE_URL</code> in Vercel and confirm the database is online.
        </div>
      ) : null}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-serif text-3xl">Shop</h1>
          <p className="text-sm opacity-70">
            {total > 0 ? `${total} result${total === 1 ? "" : "s"}` : "Browse our latest collection"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="text-sm hover:opacity-70">Home</Link>
          <span className="text-sm opacity-40">/</span>
          <span className="text-sm opacity-70">Shop</span>
        </div>
      </div>

      <form className="mt-5 flex flex-col gap-3 rounded-2xl border border-black/5 p-3 dark:border-white/10 md:flex-row">
        <label className="flex flex-1 items-center gap-3 rounded-xl border border-black/10 bg-transparent px-4 py-2.5 dark:border-white/10">
          <Search className="size-4 opacity-60" />
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="Search by style, brand, or mood"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>

        <select name="category" defaultValue={searchParams.category} className="rounded-xl border border-black/10 bg-transparent px-4 py-2.5 text-sm dark:border-white/10">
          <option value="">All categories</option>
          {CATEGORIES.filter(c => c !== "Sale").map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select name="brand" defaultValue={searchParams.brand} className="rounded-xl border border-black/10 bg-transparent px-4 py-2.5 text-sm dark:border-white/10">
          <option value="">All brands</option>
          {FEATURED_BRANDS.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>

        <select name="sort" defaultValue={searchParams.sort || "latest"} className="rounded-xl border border-black/10 bg-transparent px-4 py-2.5 text-sm dark:border-white/10">
          <option value="latest">New arrivals</option>
          <option value="price_asc">Price: Low to high</option>
          <option value="price_desc">Price: High to low</option>
          <option value="popularity">Popularity</option>
        </select>

        <button className="rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black">Apply</button>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={{
              ...item,
              isWishlisted: wishlistedIds.has(item.id),
              isInCart: cartItemIds.has(item.id),
            }}
          />
        ))}
      </div>

      {items.length === 0 ? <p className="mt-8 text-sm opacity-70">No listings match your filters.</p> : null}

      {pages > 1 ? (
        <div className="mt-8 flex items-center justify-between rounded-2xl border border-black/5 p-3 text-sm dark:border-white/10">
          <p>
            Page {page} of {pages}
          </p>
          <div className="flex gap-2">
            <Link
              className={`rounded-lg border border-black/10 px-3 py-1.5 dark:border-white/20 ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
              href={buildPageHref(searchParams, page - 1)}
            >
              Previous
            </Link>
            <Link
              className={`rounded-lg border border-black/10 px-3 py-1.5 dark:border-white/20 ${page >= pages ? "pointer-events-none opacity-50" : ""}`}
              href={buildPageHref(searchParams, page + 1)}
            >
              Next
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}
