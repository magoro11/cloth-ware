import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORIES, FEATURED_BRANDS } from "@/lib/constants";
import { ItemCard } from "@/components/item-card";
import { databaseErrorMessage, isDatabaseUnavailable } from "@/lib/errors";

export const dynamic = "force-dynamic";

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
  minDaily?: string;
  maxDaily?: string;
  mode?: "rent" | "buy";
  sort?: "latest" | "price_asc" | "price_desc";
  start?: string;
  end?: string;
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
      ? { rentalPricePerDay: "asc" as const }
      : searchParams.sort === "price_desc"
        ? { rentalPricePerDay: "desc" as const }
        : { createdAt: "desc" as const };

  let items: ItemWithRelations[] = [];
  let total = 0;
  let wishlistedIds = new Set<string>();
  let dbError = false;
  let dbErrorMessage = "Database is currently unavailable.";

  const startDate = searchParams.start ? new Date(searchParams.start) : null;
  const endDate = searchParams.end ? new Date(searchParams.end) : null;

  try {
    const where: Prisma.ItemWhereInput = {
      featured: true,
      category: searchParams.category || undefined,
      size: searchParams.size || undefined,
      brand: searchParams.brand || undefined,
      rentalPricePerDay: searchParams.minDaily || searchParams.maxDaily
        ? {
            gte: searchParams.minDaily ? Number(searchParams.minDaily) : undefined,
            lte: searchParams.maxDaily ? Number(searchParams.maxDaily) : undefined,
          }
        : undefined,
      sellingPrice: searchParams.mode === "buy" ? { not: null } : undefined,
      OR: searchParams.q
        ? [
            { title: { contains: searchParams.q, mode: "insensitive" } },
            { brand: { contains: searchParams.q, mode: "insensitive" } },
            { description: { contains: searchParams.q, mode: "insensitive" } },
          ]
        : undefined,
      bookings:
        startDate && endDate
          ? {
              none: {
                status: { in: ["PENDING", "CONFIRMED", "ACTIVE", "LATE"] },
                startDate: { lte: endDate },
                endDate: { gte: startDate },
              },
            }
          : undefined,
    };

    const [itemRows, count, wishlist] = await Promise.all([
      prisma.item.findMany({
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
      prisma.item.count({ where }),
      session?.user
        ? prisma.wishlist.findMany({ where: { userId: session.user.id }, select: { itemId: true } })
        : Promise.resolve([]),
    ]);

    items = itemRows;
    total = count;
    wishlistedIds = new Set(wishlist.map((entry) => entry.itemId));
  } catch (error) {
    dbError = isDatabaseUnavailable(error);
    dbErrorMessage = databaseErrorMessage(error);
    console.error("MarketplacePage database query failed", error);
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      {dbError ? (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          {dbErrorMessage} Please check <code>DATABASE_URL</code> in Vercel and confirm the database is online.
        </div>
      ) : null}

      <h1 className="font-serif text-4xl">Luxury Marketplace</h1>
      <p className="mt-2 text-sm opacity-70">Filter, compare, and reserve premium fashion listings in seconds.</p>

      <form className="mt-5 grid gap-3 rounded-2xl border border-black/10 p-4 dark:border-white/10 md:grid-cols-6">
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search items"
          className="rounded-lg border border-black/15 bg-transparent p-2.5 md:col-span-2"
        />

        <select name="category" defaultValue={searchParams.category} className="rounded-lg border border-black/15 bg-transparent p-2.5">
          <option value="">All categories</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <input name="size" defaultValue={searchParams.size} placeholder="Size" className="rounded-lg border border-black/15 bg-transparent p-2.5" />

        <select name="brand" defaultValue={searchParams.brand} className="rounded-lg border border-black/15 bg-transparent p-2.5">
          <option value="">All brands</option>
          {FEATURED_BRANDS.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>

        <select name="mode" defaultValue={searchParams.mode || "rent"} className="rounded-lg border border-black/15 bg-transparent p-2.5">
          <option value="rent">Rent</option>
          <option value="buy">Buy</option>
        </select>

        <input name="minDaily" type="number" min={0} defaultValue={searchParams.minDaily} placeholder="Min/day (cents)" className="rounded-lg border border-black/15 bg-transparent p-2.5" />
        <input name="maxDaily" type="number" min={0} defaultValue={searchParams.maxDaily} placeholder="Max/day (cents)" className="rounded-lg border border-black/15 bg-transparent p-2.5" />

        <input name="start" type="date" defaultValue={searchParams.start} className="rounded-lg border border-black/15 bg-transparent p-2.5" />
        <input name="end" type="date" defaultValue={searchParams.end} className="rounded-lg border border-black/15 bg-transparent p-2.5" />

        <select name="sort" defaultValue={searchParams.sort || "latest"} className="rounded-lg border border-black/15 bg-transparent p-2.5">
          <option value="latest">Latest</option>
          <option value="price_asc">Price: Low to high</option>
          <option value="price_desc">Price: High to low</option>
        </select>

        <button className="rounded-lg bg-black px-4 text-white dark:bg-white dark:text-black">Apply</button>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={{
              ...item,
              isWishlisted: wishlistedIds.has(item.id),
            }}
          />
        ))}
      </div>

      {items.length === 0 ? <p className="mt-8 text-sm opacity-70">No listings match your filters.</p> : null}

      <div className="mt-8 flex items-center justify-between rounded-2xl border border-black/10 p-3 text-sm dark:border-white/10">
        <p>
          Page {page} of {pages}
        </p>
        <div className="flex gap-2">
          <a
            className={`rounded-lg border border-black/15 px-3 py-1.5 dark:border-white/20 ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            href={buildPageHref(searchParams, page - 1)}
          >
            Previous
          </a>
          <a
            className={`rounded-lg border border-black/15 px-3 py-1.5 dark:border-white/20 ${page >= pages ? "pointer-events-none opacity-50" : ""}`}
            href={buildPageHref(searchParams, page + 1)}
          >
            Next
          </a>
        </div>
      </div>
    </main>
  );
}
