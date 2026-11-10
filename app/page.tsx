import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { listProducts, type ProductSummary } from "@/backend/actions/catalog.actions";
import { APP_TAGLINE } from "@/lib/constants";
import { databaseErrorMessage, isDatabaseUnavailable, logDatabaseIssue } from "@/backend/lib/errors";

const CATEGORIES = [
  "Dresses",
  "Shirts & Blouses",
  "Trousers & Jeans",
  "Skirts & Shorts",
  "Jackets & Coats",
  "Suits & Blazers",
  "Traditional Wear",
  "Activewear",
  "Lingerie & Sleepwear",
  "Accessories",
  "Fabrics & Textiles",
] as const;

const FEATURED_BRANDS = [
  "Zara",
  "H&M",
  "Nike",
  "Adidas",
  "Levi's",
  "Tommy Hilfiger",
  "Calvin Klein",
  "Puma",
  "Uniqlo",
  "Mango",
] as const;

const categoryImages: Record<string, string> = {
  Dresses: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=80",
  "Shirts & Blouses": "https://images.unsplash.com/photo-1596756028547-a88e0a9ad798?w=400&q=80",
  "Trousers & Jeans": "https://images.unsplash.com/photo-1542273917363-3b182515e699?w=400&q=80",
  "Skirts & Shorts": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80",
  "Jackets & Coats": "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400&q=80",
  "Suits & Blazers": "https://images.unsplash.com/photo-1594083390129-1a570a44a348?w=400&q=80",
  "Traditional Wear": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80",
  Activewear: "https://images.unsplash.com/photo-1517836357463-d25dfea34404?w=400&q=80",
  "Lingerie & Sleepwear": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80",
  Accessories: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80",
  "Fabrics & Textiles": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&q=80",
};

export const dynamic = "force-dynamic";
export const revalidate = 60;

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function Home() {
  let featured: ProductSummary[] = [];
  let newArrivals: ProductSummary[] = [];
  let flashSale: ProductSummary[] = [];
  let recommended: ProductSummary[] = [];
  let dbError = false;
  let dbErrorMessage = "Database is currently unavailable.";

  try {
    const [featuredResult, newArrivalsResult, flashSaleResult, recommendedResult] = await Promise.all([
      listProducts({ sort: "popularity", page: 1, pageSize: 12 }),
      listProducts({ sort: "newest", page: 1, pageSize: 12 }),
      listProducts({ sort: "newest", page: 1, pageSize: 12 }),
      listProducts({ sort: "rating", page: 1, pageSize: 12 }),
    ]);
    featured = featuredResult.products;
    newArrivals = newArrivalsResult.products;
    flashSale = flashSaleResult.products;
    recommended = recommendedResult.products;
  } catch (error) {
    dbError = isDatabaseUnavailable(error);
    dbErrorMessage = databaseErrorMessage(error);
    logDatabaseIssue("Home page database query failed", error);
  }

  const featuredImage =
    featured[0]?.images[0]?.url ??
    newArrivals[0]?.images[0]?.url ??
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80";

  return (
    <main className="mx-auto max-w-7xl md:px-8">
      {dbError ? (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          {dbErrorMessage} Please check <code>DATABASE_URL</code> in Vercel and confirm the database is online.
        </div>
      ) : null}

      <section className="relative mx-4 mt-4 overflow-hidden rounded-2xl border border-black/5 bg-black/90 text-white md:mx-0 md:mt-6">
        <div className="grid gap-6 md:grid-cols-2 md:items-center">
          <div className="space-y-4 p-6 md:p-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">New season</p>
            <h1 className="font-serif text-4xl leading-tight md:text-6xl">{APP_TAGLINE}</h1>
            <p className="max-w-md text-sm leading-7 text-white/75">
              Shop the latest trends with free delivery on orders over KES 5,000. Pay on delivery available.
            </p>
            <form action="/marketplace" className="flex items-center gap-3">
              <input
                name="q"
                placeholder="Search products, brands..."
                className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm outline-none placeholder:text-white/60"
              />
              <button className="shrink-0 rounded-full bg-[#c25e30] px-5 py-3 text-sm font-semibold hover:bg-[#a84d26]">
                Search
              </button>
            </form>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/marketplace?category=Dresses"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90"
              >
                Shop Dresses <ArrowRight className="size-4" />
              </Link>
              <Link href="/marketplace" className="rounded-full border border-white/25 px-5 py-3 text-sm font-medium hover:bg-white/10">
                Explore All
              </Link>
            </div>
          </div>
          <div className="relative hidden aspect-[4/3] md:block">
            <Image src={featuredImage} alt="New arrival" fill className="object-cover" />
          </div>
        </div>
      </section>

      <section className="mx-4 mt-4 md:mx-0">
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {CATEGORIES.map((category) => (
            <Link
              key={category}
              href={`/marketplace?category=${category}`}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-black/5 bg-white p-4 text-center transition hover:shadow-md dark:border-white/10 dark:bg-[#151822]"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black/5 dark:bg-white/5">
                <Image src={categoryImages[category] ?? categoryImages.Dresses} alt={category} fill className="object-cover" />
              </div>
              <span className="text-xs font-medium">{category}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-4 mt-10 md:mx-0">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Top Selling</h2>
          <Link href="/marketplace" className="text-sm font-semibold text-[#c25e30] hover:opacity-70">
            See All
          </Link>
        </div>
        <div className="mt-4 flex gap-4 overflow-x-auto pb-4 md:mx-0">
          {featured.map((item) => (
            <div key={item.id} className="min-w-[260px] max-w-[260px] snap-start">
              <ProductCardPreview item={item} />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-4 mt-10 md:mx-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-2xl">Flash Sale</h2>
          </div>
          <Link href="/marketplace?sort=popularity" className="text-sm font-semibold text-[#c25e30] hover:opacity-70">
            See All
          </Link>
        </div>
        <div className="mt-4 flex gap-4 overflow-x-auto pb-4 md:mx-0">
          {flashSale.map((item) => (
            <div key={item.id} className="min-w-[260px] max-w-[260px] snap-start">
              <ProductCardPreview item={item} />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-4 mt-10 md:mx-0">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">New Arrivals</h2>
          <Link href="/marketplace" className="text-sm font-semibold text-[#c25e30] hover:opacity-70">
            See All
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {newArrivals.slice(0, 10).map((item) => (
            <ProductCardPreview key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="mx-4 mt-10 md:mx-0">
        <div className="rounded-2xl border border-black/5 bg-gradient-to-r from-[#c25e30] to-[#a84d26] p-6 text-white dark:border-white/10 md:p-10">
          <div className="grid gap-6 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Flash Sale</p>
              <h2 className="mt-2 font-serif text-3xl md:text-4xl">Today&rsquo;s Best Deals</h2>
              <p className="mt-3 text-sm leading-7 text-white/80">
                Grab these limited-time offers before they are gone. Free delivery on selected items.
              </p>
              <Link href="/marketplace?sort=popularity" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90">
                Shop Deals <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/20 bg-white/10 p-4">
                <p className="text-2xl font-semibold">Up to 50%</p>
                <p className="mt-1 text-xs text-white/80">Off selected items</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 p-4">
                <p className="text-2xl font-semibold">24h</p>
                <p className="mt-1 text-xs text-white/80">Limited time only</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 p-4">
                <p className="text-2xl font-semibold">Free</p>
                <p className="mt-1 text-xs text-white/80">Delivery on deals</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 p-4">
                <p className="text-2xl font-semibold">COD</p>
                <p className="mt-1 text-xs text-white/80">Pay on delivery</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-4 mt-10 md:mx-0">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Shop by Category</h2>
          <Link href="/marketplace" className="text-sm font-semibold text-[#c25e30] hover:opacity-70">
            See All
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-5 lg:grid-cols-10">
          {CATEGORIES.map((category) => (
            <Link
              key={category}
              href={`/marketplace?category=${category}`}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-black/5 bg-white p-3 text-center transition hover:shadow-md dark:border-white/10 dark:bg-[#151822]"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black/5 dark:bg-white/5">
                <Image src={categoryImages[category] ?? categoryImages.Dresses} alt={category} fill className="object-cover" />
              </div>
              <span className="text-[11px] font-medium leading-tight">{category}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-4 mt-10 md:mx-0">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Recommended For You</h2>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {recommended.slice(0, 10).map((item) => (
            <ProductCardPreview key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="mx-4 mt-10 md:mx-0">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Best Sellers</h2>
          <Link href="/marketplace" className="text-sm font-semibold text-[#c25e30] hover:opacity-70">
            See All
          </Link>
        </div>
        <div className="mt-4 flex gap-4 overflow-x-auto pb-4 md:mx-0">
          {featured.map((item) => (
            <div key={item.id} className="min-w-[260px] max-w-[260px] snap-start">
              <ProductCardPreview item={item} />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-4 my-10 md:mx-0">
        <div className="rounded-2xl border border-black/5 bg-white/80 p-6 dark:border-white/10 dark:bg-white/5 md:p-10">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-black/60 dark:text-white/60">
                Free delivery
              </p>
              <h2 className="mt-2 font-serif text-3xl md:text-4xl">Free shipping on orders over KES 5,000</h2>
              <p className="mt-3 text-sm leading-7 text-black/70 dark:text-white/72">
                Enjoy free delivery on all orders above KES 5,000. Return items within 30 days if you are not satisfied.
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium text-black/70 dark:text-white/70">
                <span>• Pay on delivery</span>
                <span>• 30-day returns</span>
                <span>• Secure checkout</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-black/5 p-4 dark:border-white/10">
                <p className="text-2xl font-semibold">30 days</p>
                <p className="mt-1 text-xs text-black/60 dark:text-white/60">Easy returns</p>
              </div>
              <div className="rounded-xl border border-black/5 p-4 dark:border-white/10">
                <p className="text-2xl font-semibold">Secure</p>
                <p className="mt-1 text-xs text-black/60 dark:text-white/60">Checkout</p>
              </div>
              <div className="rounded-xl border border-black/5 p-4 dark:border-white/10">
                <p className="text-2xl font-semibold">24/7</p>
                <p className="mt-1 text-xs text-black/60 dark:text-white/60">Support</p>
              </div>
              <div className="rounded-xl border border-black/5 p-4 dark:border-white/10">
                <p className="text-2xl font-semibold">Pay</p>
                <p className="mt-1 text-xs text-black/60 dark:text-white/60">On delivery</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-4 my-10 md:mx-0">
        <div className="rounded-2xl border border-black/5 bg-black/90 p-6 text-white dark:border-white/10 md:p-10">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Newsletter</p>
              <h2 className="mt-2 font-serif text-3xl md:text-4xl">Get early access to drops</h2>
              <p className="mt-3 text-sm leading-7 text-white/75">
                Sign up for our newsletter and be the first to know about new arrivals, exclusive offers, and style guides.
              </p>
            </div>
            <form className="flex flex-col gap-3 md:flex-row">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm outline-none placeholder:text-white/60"
                required
              />
              <button className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-white/90">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProductCardPreview({ item }: { item: ProductSummary }) {
  const primaryImage = item.images[0]?.url ?? null;
  const discount =
    item.basePrice > item.minPrice
      ? Math.round(((item.basePrice - item.minPrice) / item.basePrice) * 100)
      : null;

  return (
    <div className="group flex flex-col">
      <Link href={`/product/${item.slug}`} className="block overflow-hidden rounded-2xl border border-black/5 bg-white transition hover:shadow-lg dark:border-white/10 dark:bg-[#151822]">
        <div className="relative aspect-square overflow-hidden bg-black/5 dark:bg-white/5">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={item.title}
              className="object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="grid h-full place-content-center text-sm opacity-60">No image</div>
          )}
          {discount && (
            <span className="absolute left-2 top-2 rounded-full bg-[#c25e30] px-2 py-1 text-[11px] font-semibold text-white">
              -{discount}%
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-3">
          <p className="text-[11px] uppercase tracking-widest opacity-60">{item.vendorName}</p>
          <h3 className="line-clamp-2 text-sm font-medium">{item.title}</h3>

          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <div className="flex items-baseline gap-2">
              <p className="text-base font-semibold text-[#c25e30]">{formatCurrency(item.minPrice)}</p>
              {item.basePrice > item.minPrice && (
                <p className="text-[11px] line-through opacity-60">{formatCurrency(item.basePrice)}</p>
              )}
            </div>
            {item.averageRating ? (
              <div className="flex flex-col items-end gap-0.5">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`size-3 ${
                        star <= Math.round(item.averageRating ?? 0)
                          ? "fill-[#ffbf00] text-[#ffbf00]"
                          : "text-black/20"
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-[10px] font-medium text-black/60 dark:text-white/60">
                  ({item.reviewCount})
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </Link>
    </div>
  );
}
