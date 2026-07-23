import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Prisma } from "@prisma/client";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { APP_TAGLINE, CATEGORIES, FEATURED_BRANDS } from "@/lib/constants";
import { ItemCard } from "@/frontend/components/item-card";
import { ClientFlashSaleCountdown } from "@/frontend/components/client-flash-sale-countdown";

export const dynamic = "force-dynamic";
export const revalidate = 30;

type ItemWithRelations = Prisma.ItemGetPayload<{
  include: { images: true; reviews: true };
}>;

function pickImage(item: ItemWithRelations) {
  return item.images.find((image) => image.url)?.url ?? null;
}

export default async function Home() {
  let topSelling: ItemWithRelations[] = [];
  let newArrivals: ItemWithRelations[] = [];
  let flashSale: ItemWithRelations[] = [];
  let recommended: ItemWithRelations[] = [];

  try {
    [topSelling, newArrivals, flashSale, recommended] = await Promise.all([
      prisma.item.findMany({
        where: { featured: true, isAvailable: true },
        include: { images: true, reviews: { take: 3, orderBy: { createdAt: "desc" } } },
        orderBy: { reviews: { _count: "desc" } },
        take: 12,
      }),
      prisma.item.findMany({
        where: { featured: true, isAvailable: true },
        include: { images: true, reviews: { take: 3, orderBy: { createdAt: "desc" } } },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      prisma.item.findMany({
        where: { featured: true, isAvailable: true, sellingPrice: { not: null } },
        include: { images: true, reviews: { take: 3, orderBy: { createdAt: "desc" } } },
        orderBy: { createdAt: "asc" },
        take: 12,
      }),
      prisma.item.findMany({
        where: { isAvailable: true },
        include: { images: true, reviews: { take: 3, orderBy: { createdAt: "desc" } } },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
    ]);
  } catch {
    topSelling = [];
    newArrivals = [];
    flashSale = [];
    recommended = [];
  }

  const categoryImages: Record<string, string> = {
    Electronics: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80",
    Fashion: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80",
    "Phones & Tablets": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80",
    "Home & Living": "https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400&q=80",
    "Beauty & Health": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80",
    Supermarket: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80",
    Computing: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80",
    Gaming: "https://images.unsplash.com/photo-1542751371-adc3840a45e5?w=400&q=80",
    "Sports & Outdoors": "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&q=80",
    Automotive: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=80",
  };

  const categoryHeroImages: Record<string, string> = {
    Electronics: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80",
    Fashion: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80",
    "Phones & Tablets": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80",
    "Home & Living": "https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800&q=80",
    "Beauty & Health": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80",
    Supermarket: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
    Computing: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80",
    Gaming: "https://images.unsplash.com/photo-1542751371-adc3840a45e5?w=800&q=80",
    "Sports & Outdoors": "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80",
    Automotive: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80",
  };

  const heroImage = categoryHeroImages[CATEGORIES[0]];
  const featuredImage = heroImage ?? pickImage(newArrivals[0] ?? topSelling[0]);

  return (
    <main className="mx-auto max-w-7xl md:px-8">
      <section className="relative mx-4 mt-4 overflow-hidden rounded-2xl border border-black/5 bg-black/90 text-white md:mx-0 md:mt-6">
        <div className="grid gap-6 md:grid-cols-2 md:items-center">
          <div className="space-y-4 p-6 md:p-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">New season</p>
            <h1 className="font-serif text-4xl leading-tight md:text-6xl">{APP_TAGLINE}</h1>
            <p className="max-w-md text-sm leading-7 text-white/75">
              Shop the latest trends with free delivery on orders over $100. Pay on delivery available.
            </p>
            <form action="/marketplace" className="flex items-center gap-3">
              <input
                name="q"
                placeholder="Search for clothes, shoes, brands..."
                className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm outline-none placeholder:text-white/60"
              />
              <button className="shrink-0 rounded-full bg-[#c25e30] px-5 py-3 text-sm font-semibold hover:bg-[#a84d26]">Search</button>
            </form>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/marketplace?category=Fashion" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90">
                Shop Fashion <ArrowRight className="size-4" />
              </Link>
              <Link href="/marketplace" className="rounded-full border border-white/25 px-5 py-3 text-sm font-medium hover:bg-white/10">
                Explore All
              </Link>
            </div>
          </div>
          {featuredImage ? (
            <div className="relative hidden aspect-[4/3] md:block">
              <Image src={featuredImage} alt="New arrival" fill className="object-cover" />
            </div>
          ) : null}
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
                <Image src={categoryImages[category] ?? categoryImages.Women} alt={category} fill className="object-cover" />
              </div>
              <span className="text-xs font-medium">{category}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-4 mt-10 md:mx-0">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Top Selling</h2>
          <Link href="/marketplace" className="text-sm font-semibold text-[#c25e30] hover:opacity-70">See All</Link>
        </div>
        <div className="mt-4 flex gap-4 overflow-x-auto pb-4 md:mx-0">
          {topSelling.map((item) => (
            <div key={item.id} className="min-w-[260px] max-w-[260px] snap-start">
              <ItemCard item={item} />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-4 mt-10 md:mx-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-2xl">Flash Sale</h2>
            <ClientFlashSaleCountdown />
          </div>
          <Link href="/marketplace?category=Sale" className="text-sm font-semibold text-[#c25e30] hover:opacity-70">See All</Link>
        </div>
        <div className="mt-4 flex gap-4 overflow-x-auto pb-4 md:mx-0">
          {flashSale.map((item) => (
            <div key={item.id} className="min-w-[260px] max-w-[260px] snap-start">
              <ItemCard item={item} />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-4 mt-10 md:mx-0">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">New Arrivals</h2>
          <Link href="/marketplace" className="text-sm font-semibold text-[#c25e30] hover:opacity-70">See All</Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {newArrivals.slice(0, 10).map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="mx-4 mt-10 md:mx-0">
        <div className="rounded-2xl border border-black/5 bg-gradient-to-r from-[#c25e30] to-[#a84d26] p-6 text-white dark:border-white/10 md:p-10">
          <div className="grid gap-6 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Flash Sale</p>
              <h2 className="mt-2 font-serif text-3xl md:text-4xl">Today&apos;s Best Deals</h2>
              <p className="mt-3 text-sm leading-7 text-white/80">
                Grab these limited-time offers before they are gone. Free delivery on selected items.
              </p>
              <Link href="/marketplace?category=Sale" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90">
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
          <h2 className="font-serif text-2xl">What Our Customers Say</h2>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { name: "Grace N.", text: "Fast delivery and authentic products. Best marketplace experience!" },
            { name: "James K.", text: "Great prices and excellent customer service. Highly recommended." },
            { name: "Amina H.", text: "Easy checkout process and secure payments. Love shopping here." },
          ].map((review) => (
            <div key={review.name} className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-[#151822]">
              <p className="text-sm leading-7 text-black/80 dark:text-white/80">&ldquo;{review.text}&rdquo;</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-black/60 dark:text-white/60">- {review.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-4 mt-10 md:mx-0">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Shop by Category</h2>
          <Link href="/marketplace" className="text-sm font-semibold text-[#c25e30] hover:opacity-70">See All</Link>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-5 lg:grid-cols-10">
          {CATEGORIES.map((category) => (
            <Link
              key={category}
              href={`/marketplace?category=${category}`}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-black/5 bg-white p-3 text-center transition hover:shadow-md dark:border-white/10 dark:bg-[#151822]"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black/5 dark:bg-white/5">
                <Image src={categoryImages[category] ?? categoryImages.Electronics} alt={category} fill className="object-cover" />
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
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="mx-4 mt-10 md:mx-0">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Best Sellers</h2>
          <Link href="/marketplace" className="text-sm font-semibold text-[#c25e30] hover:opacity-70">See All</Link>
        </div>
        <div className="mt-4 flex gap-4 overflow-x-auto pb-4 md:mx-0">
          {topSelling.map((item) => (
            <div key={item.id} className="min-w-[260px] max-w-[260px] snap-start">
              <ItemCard item={item} />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-4 mt-10 md:mx-0">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Brands We Love</h2>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {FEATURED_BRANDS.map((brand) => (
            <Link
              key={brand}
              href={`/marketplace?q=${encodeURIComponent(brand)}`}
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black/70 transition hover:bg-black hover:text-white dark:border-white/10 dark:bg-white/5 dark:text-white/70"
            >
              {brand}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-4 my-10 md:mx-0">
        <div className="rounded-2xl border border-black/5 bg-white/80 p-6 dark:border-white/10 dark:bg-white/5 md:p-10">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-black/60 dark:text-white/60">Free delivery</p>
              <h2 className="mt-2 font-serif text-3xl md:text-4xl">Free shipping on orders over $100</h2>
              <p className="mt-3 text-sm leading-7 text-black/70 dark:text-white/72">
                Enjoy free delivery on all orders above $100. Return items within 30 days if you are not satisfied.
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
              <button className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-white/90">Subscribe</button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
