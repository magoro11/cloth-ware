import { Prisma } from "@prisma/client";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORIES, FEATURED_BRANDS, LEGACY_CATEGORY_MAP } from "@/lib/constants";
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

const PAGE_SIZE = 24;

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
    const activeCategory = searchParams.category;
    const legacyCategories = activeCategory ? (Object.entries(LEGACY_CATEGORY_MAP) as [string, string][]).filter(([, target]) => target === activeCategory).map(([legacy]) => legacy) : [];
    
    const where: Prisma.ItemWhereInput = {
      isAvailable: true,
      featured: activeCategory === "Sale" ? undefined : true,
      category: activeCategory ? { in: [activeCategory, ...legacyCategories] } : undefined,
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
  const activeCategory = searchParams.category;
  const activeBrand = searchParams.brand;
  const hasFilters = activeCategory || activeBrand || searchParams.q || searchParams.minPrice || searchParams.maxPrice;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      {dbError ? (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          {dbErrorMessage} Please check <code>DATABASE_URL</code> in Vercel and confirm the database is online.
        </div>
      ) : null}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-sans text-3xl font-bold tracking-tight text-black dark:text-white">
            {activeCategory || "All Products"}
          </h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            {total > 0 ? `${total} product${total === 1 ? "" : "s"}` : "No products found"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="text-sm hover:opacity-70">Home</Link>
          <span className="text-sm opacity-40">/</span>
          <span className="text-sm font-medium">Shop</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[280px,1fr]">
        <aside className="hidden lg:block">
          <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-[#151822]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-black/60 dark:text-white/60">Filters</p>
              {hasFilters ? (
                <Link href="/marketplace" className="text-xs text-[#c25e30] hover:underline">Clear all</Link>
              ) : null}
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-black/70 dark:text-white/70">Category</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CATEGORIES.map((category) => (
                    <Link
                      key={category}
                      href={`/marketplace?category=${encodeURIComponent(category)}`}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                        activeCategory === category
                          ? "border-[#c25e30] bg-[#c25e30]/10 text-[#c25e30]"
                          : "border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                      }`}
                    >
                      {category}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-black/70 dark:text-white/70">Brand</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {FEATURED_BRANDS.map((brand) => (
                    <Link
                      key={brand}
                      href={`/marketplace?q=${encodeURIComponent(brand)}`}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                        activeBrand === brand
                          ? "border-[#c25e30] bg-[#c25e30]/10 text-[#c25e30]"
                          : "border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                      }`}
                    >
                      {brand}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-black/70 dark:text-white/70">Price Range</p>
                <form className="mt-2 flex items-center gap-2">
                  <input name="minPrice" defaultValue={searchParams.minPrice} placeholder="Min" className="w-full rounded-lg border border-black/10 px-2.5 py-1.5 text-xs dark:border-white/10" />
                  <span className="text-xs text-black/40">-</span>
                  <input name="maxPrice" defaultValue={searchParams.maxPrice} placeholder="Max" className="w-full rounded-lg border border-black/10 px-2.5 py-1.5 text-xs dark:border-white/10" />
                </form>
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <form className="flex flex-col gap-3 rounded-2xl border border-black/5 p-3 dark:border-white/10 md:flex-row">
            <label className="flex flex-1 items-center gap-3 rounded-xl border border-black/10 bg-transparent px-4 py-2.5 dark:border-white/10">
              <Search className="size-4 opacity-60" />
              <input
                name="q"
                defaultValue={searchParams.q}
                placeholder="Search products, brands..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </label>

            <select name="category" defaultValue={searchParams.category} className="rounded-xl border border-black/10 bg-transparent px-4 py-2.5 text-sm dark:border-white/10">
              <option value="">All categories</option>
          {CATEGORIES.map((category) => (
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

            <button className="rounded-xl bg-[#F68B1E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e07d18]">Apply</button>
          </form>

          {hasFilters ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-black/60 dark:text-white/60">Active filters:</span>
              {activeCategory ? (
                <Link href={`/marketplace?${new URLSearchParams({ ...searchParams, category: "" }).toString()}`} className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-black/5 px-2.5 py-1 dark:border-white/10 dark:bg-white/5">
                  {activeCategory} <X className="size-3" />
                </Link>
              ) : null}
              {activeBrand ? (
                <Link href={`/marketplace?${new URLSearchParams({ ...searchParams, brand: "" }).toString()}`} className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-black/5 px-2.5 py-1 dark:border-white/10 dark:bg-white/5">
                  {activeBrand} <X className="size-3" />
                </Link>
              ) : null}
              {searchParams.q ? (
                <Link href={`/marketplace?${new URLSearchParams({ ...searchParams, q: "" }).toString()}`} className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-black/5 px-2.5 py-1 dark:border-white/10 dark:bg-white/5">
                  &ldquo;{searchParams.q}&rdquo; <X className="size-3" />
                </Link>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/15 p-8 text-center text-sm opacity-75 dark:border-white/20">
              No products match your filters. Try adjusting your search or browse all categories.
            </div>
          ) : null}

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
        </div>
      </div>
    </main>
  );
}
