import Link from "next/link";
import { Search, X } from "lucide-react";
import { listProducts, type ListProductsInput, type ProductSummary } from "@/backend/actions/catalog.actions";
import { getFilterOptions, type FilterOptions } from "@/backend/actions/catalog.actions";
import { formatCurrency } from "@/backend/lib/utils";
import { databaseErrorMessage, isDatabaseUnavailable, logDatabaseIssue } from "@/backend/lib/errors";

const PAGE_SIZE = 24;

type SearchParams = Promise<{
  category?: string;
  brand?: string;
  q?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: "popularity" | "newest" | "price_asc" | "price_desc" | "rating";
  page?: string;
}>;

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

  const page = Math.max(1, Number(searchParams.page || "1"));

  let products: ProductSummary[] = [];
  let total = 0;
  let pages = 1;
  let dbError = false;
  let dbErrorMessage = "Database is currently unavailable.";
  let filterOptions: FilterOptions | null = null;

  try {
    const [data, filters] = await Promise.all([
      listProducts({
        category: searchParams.category || undefined,
        brand: searchParams.brand || undefined,
        search: searchParams.q || undefined,
        minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
        maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
        sort: (searchParams.sort ?? "newest") as ListProductsInput["sort"],
        page,
        pageSize: PAGE_SIZE,
      }),
      getFilterOptions({
        category: searchParams.category || undefined,
        brand: searchParams.brand || undefined,
      }),
    ]);

    products = data.products;
    total = data.total;
    pages = data.pages;
    filterOptions = filters;
  } catch (error) {
    dbError = isDatabaseUnavailable(error);
    dbErrorMessage = databaseErrorMessage(error);
    logDatabaseIssue("MarketplacePage database query failed", error);
  }

  const activeCategory = searchParams.category;
  const activeBrand = searchParams.brand;
  const hasFilters =
    activeCategory ||
    activeBrand ||
    searchParams.q ||
    searchParams.minPrice ||
    searchParams.maxPrice;

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
          {filterOptions ? (
            <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-[#151822]">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-black/60 dark:text-white/60">
                  Filters
                </p>
                {hasFilters ? (
                  <Link href="/marketplace" className="text-xs text-[#c25e30] hover:underline">
                    Clear all
                  </Link>
                ) : null}
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-black/70 dark:text-white/70 mb-2">
                    Category
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.categories.map((cat) => (
                      <Link
                        key={cat.slug}
                        href={`/marketplace?category=${encodeURIComponent(cat.slug)}`}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                          activeCategory === cat.slug
                            ? "border-[#c25e30] bg-[#c25e30]/10 text-[#c25e30]"
                            : "border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                        }`}
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-black/70 dark:text-white/70 mb-2">
                    Brand
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.brands.map((brand) => (
                      <Link
                        key={brand.slug}
                        href={`/marketplace?brand=${encodeURIComponent(brand.slug)}`}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                          activeBrand === brand.slug
                            ? "border-[#c25e30] bg-[#c25e30]/10 text-[#c25e30]"
                            : "border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                        }`}
                      >
                        {brand.name}
                      </Link>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-black/70 dark:text-white/70 mb-2">
                    Price Range
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      name="minPrice"
                      defaultValue={searchParams.minPrice}
                      placeholder="Min"
                      className="w-full rounded-lg border border-black/10 px-2.5 py-1.5 text-xs dark:border-white/10"
                    />
                    <span className="text-xs text-black/40">-</span>
                    <input
                      name="maxPrice"
                      defaultValue={searchParams.maxPrice}
                      placeholder="Max"
                      className="w-full rounded-lg border border-black/10 px-2.5 py-1.5 text-xs dark:border-white/10"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-black/40">
                    {filterOptions.priceRange.min} - {filterOptions.priceRange.max}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-black/70 dark:text-white/70 mb-2">
                    Condition
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.conditions.map((cond) => (
                      <Link
                        key={cond.value}
                        href={`/marketplace?condition=${encodeURIComponent(cond.value)}`}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs transition border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5`}
                      >
                        {cond.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
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

            <select
              name="category"
              defaultValue={searchParams.category}
              className="rounded-xl border border-black/10 bg-transparent px-4 py-2.5 text-sm dark:border-white/10"
            >
              <option value="">All categories</option>
              {filterOptions?.categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              name="brand"
              defaultValue={searchParams.brand}
              className="rounded-xl border border-black/10 bg-transparent px-4 py-2.5 text-sm dark:border-white/10"
            >
              <option value="">All brands</option>
              {filterOptions?.brands.map((brand) => (
                <option key={brand.slug} value={brand.slug}>
                  {brand.name}
                </option>
              ))}
            </select>

            <select
              name="sort"
              defaultValue={searchParams.sort || "newest"}
              className="rounded-xl border border-black/10 bg-transparent px-4 py-2.5 text-sm dark:border-white/10"
            >
              <option value="newest">New arrivals</option>
              <option value="price_asc">Price: Low to high</option>
              <option value="price_desc">Price: High to low</option>
              <option value="popularity">Popularity</option>
              <option value="rating">Top rated</option>
            </select>

            <button
              className="rounded-xl bg-[#F68B1E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e07d18]"
            >
              Apply
            </button>
          </form>

          {hasFilters ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-black/60 dark:text-white/60">Active filters:</span>
              {activeCategory ? (
                <Link
                  href={`/marketplace?${new URLSearchParams({ ...searchParams, category: "" }).toString()}`}
                  className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-black/5 px-2.5 py-1 dark:border-white/10 dark:bg-white/5"
                >
                  {activeCategory} <X className="size-3" />
                </Link>
              ) : null}
              {activeBrand ? (
                <Link
                  href={`/marketplace?${new URLSearchParams({ ...searchParams, brand: "" }).toString()}`}
                  className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-black/5 px-2.5 py-1 dark:border-white/10 dark:bg-white/5"
                >
                  {activeBrand} <X className="size-3" />
                </Link>
              ) : null}
              {searchParams.q ? (
                <Link
                  href={`/marketplace?${new URLSearchParams({ ...searchParams, q: "" }).toString()}`}
                  className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-black/5 px-2.5 py-1 dark:border-white/10 dark:bg-white/5"
                >
                  &ldquo;{searchParams.q}&rdquo; <X className="size-3" />
                </Link>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div key={product.id} className="group flex flex-col">
                <Link
                  href={`/product/${product.slug}`}
                  className="block overflow-hidden rounded-2xl border border-black/5 bg-white transition hover:shadow-lg dark:border-white/10 dark:bg-[#151822]"
                >
                  <div className="relative aspect-square overflow-hidden bg-black/5 dark:bg-white/5">
                    {product.images[0]?.url ? (
                      <img
                        src={product.images[0].url}
                        alt={product.title}
                        className="object-cover transition duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid h-full place-content-center text-sm opacity-60">No image</div>
                    )}
                    {product.isOfficial && (
                      <span className="absolute left-2 top-2 rounded-full bg-[#c25e30] px-2 py-1 text-[11px] font-semibold text-white">
                        Official Store
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-1.5 p-3">
                    <p className="text-[11px] uppercase tracking-widest opacity-60">{product.vendorName}</p>
                    <h3 className="line-clamp-2 text-sm font-medium">{product.title}</h3>

                    <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                      <div className="flex items-baseline gap-2">
                        <p className="text-base font-semibold text-[#c25e30]">{formatCurrency(product.minPrice)}</p>
                        {product.basePrice > product.minPrice && (
                          <p className="text-[11px] line-through opacity-60">{formatCurrency(product.basePrice)}</p>
                        )}
                        <p className="text-[11px] text-black/50 dark:text-white/50">Free delivery</p>
                      </div>
                      {product.averageRating ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                className={`size-3 ${
                                  star <= Math.round(product.averageRating ?? 0)
                                    ? "fill-[#ffbf00] text-[#ffbf00]"
                                    : "text-black/20"
                                }`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                          <span className="text-[10px] font-medium text-black/60 dark:text-white/60">
                            ({product.reviewCount})
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </div>
            ))}

            {products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/15 p-8 text-center text-sm opacity-75 dark:border-white/20">
                No products match your filters. Try adjusting your search or browse all categories.
              </div>
            ) : null}

            {pages > 1 ? (
              <div className="mt-8 flex items-center justify-between rounded-2xl border border-black/5 p-3 text-sm dark:border-white/10">
                <p>Page {page} of {pages}</p>
                <div className="flex gap-2">
                  <Link
                    className={`rounded-lg border border-black/10 px-3 py-1.5 dark:border-white/20 ${
                      page <= 1 ? "pointer-events-none opacity-50" : ""
                    }`}
                    href={buildPageHref(searchParams, page - 1)}
                  >
                    Previous
                  </Link>
                  <Link
                    className={`rounded-lg border border-black/10 px-3 py-1.5 dark:border-white/20 ${
                      page >= pages ? "pointer-events-none opacity-50" : ""
                    }`}
                    href={buildPageHref(searchParams, page + 1)}
                  >
                    Next
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
