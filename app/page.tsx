import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Prisma } from "@prisma/client";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { APP_TAGLINE, CATEGORIES, FEATURED_BRANDS } from "@/lib/constants";
import { ItemCard } from "@/frontend/components/item-card";
import { LiveFlashSaleCountdown } from "@/frontend/components/live-flash-sale-countdown";

export const dynamic = "force-dynamic";
export const revalidate = 30;

type ItemWithRelations = Prisma.ItemGetPayload<{
  include: { images: true; owner: { select: { role: true } }; reviews: true };
}>;

function pickImage(item: ItemWithRelations) {
  return item.images.find((image) => image.url)?.url ?? null;
}

export default async function Home() {
  let topSelling: ItemWithRelations[] = [];
  let newArrivals: ItemWithRelations[] = [];
  let flashSale: ItemWithRelations[] = [];

  try {
    [topSelling, newArrivals, flashSale] = await Promise.all([
      prisma.item.findMany({
        where: { featured: true, isAvailable: true },
        include: { images: true, owner: { select: { role: true } }, reviews: true },
        orderBy: { reviews: { _count: "desc" } },
        take: 12,
      }),
      prisma.item.findMany({
        where: { featured: true, isAvailable: true },
        include: { images: true, owner: { select: { role: true } }, reviews: true },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      prisma.item.findMany({
        where: { featured: true, isAvailable: true, sellingPrice: { not: null } },
        include: { images: true, owner: { select: { role: true } }, reviews: true },
        orderBy: { createdAt: "asc" },
        take: 12,
      }),
    ]);
  } catch {
    topSelling = [];
    newArrivals = [];
    flashSale = [];
  }

  const featuredImage = pickImage(newArrivals[0] ?? topSelling[0]);

  const categoryImages: Record<string, string> = {
    Women: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80",
    Men: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=400&q=80",
    Shoes: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80",
    Bags: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=80",
    Accessories: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&q=80",
    Sale: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80",
  };

  // eslint-disable-next-line react-hooks/purity
  const flashSaleDeadline = new Date(Date.now() + 10 * 60 * 60 * 1000);

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
              <Link href="/marketplace?category=Sale" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90">
                Shop sale <ArrowRight className="size-4" />
              </Link>
              <Link href="/marketplace?category=Women" className="rounded-full border border-white/25 px-5 py-3 text-sm font-medium hover:bg-white/10">
                Shop women
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
            <LiveFlashSaleCountdown deadline={flashSaleDeadline} />
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
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Shop by Category</h2>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-6">
          {CATEGORIES.map((category) => (
            <Link
              key={category}
              href={`/marketplace?category=${category}`}
              className="flex flex-col items-center gap-2 rounded-2xl border border-black/5 bg-white p-3 transition hover:shadow-md dark:border-white/10 dark:bg-[#151822]"
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
