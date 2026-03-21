import Link from "next/link";
import { ShieldCheck, Sparkles, Truck, Wallet } from "lucide-react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { APP_NAME, APP_TAGLINE, CATEGORIES, FEATURED_BRANDS } from "@/lib/constants";
import { ItemCard } from "@/components/item-card";

export const dynamic = "force-dynamic";

type ItemWithRelations = Prisma.ItemGetPayload<{
  include: { images: true; owner: { select: { role: true } }; reviews: true };
}>;

export default async function Home() {
  let featuredItems: ItemWithRelations[] = [];
  let trendingItems: ItemWithRelations[] = [];

  try {
    [featuredItems, trendingItems] = await Promise.all([
      prisma.item.findMany({
        where: { featured: true },
        include: { images: true, owner: { select: { role: true } }, reviews: true },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      prisma.item.findMany({
        where: { featured: true },
        include: { images: true, owner: { select: { role: true } }, reviews: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);
  } catch {
    featuredItems = [];
    trendingItems = [];
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-[linear-gradient(120deg,#f7f2e8_0%,#f3eee3_44%,#ebe5d8_100%)] p-8 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(120deg,#161a24_0%,#121521_45%,#0f131d_100%)] md:p-14">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-black/5 dark:bg-white/10" />
        <div className="absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-[#b89b6f]/15 blur-3xl" />
        <p className="relative text-xs uppercase tracking-[0.18em] opacity-70">{APP_NAME}</p>
        <h1 className="relative mt-3 max-w-4xl font-serif text-5xl leading-tight md:text-7xl">
          Rent runway looks. <br className="hidden md:block" />
          Resell with confidence.
        </h1>
        <p className="relative mt-4 max-w-2xl text-sm opacity-75 md:text-base">{APP_TAGLINE}</p>
        <div className="relative mt-8 flex flex-wrap gap-3">
          <Link href="/marketplace" className="rounded-full bg-black px-6 py-2.5 text-sm text-white dark:bg-white dark:text-black">
            Browse Marketplace
          </Link>
          <Link href="/list-item" className="rounded-full border border-black/20 px-6 py-2.5 text-sm dark:border-white/20">
            List Your Item
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-3xl">Featured Brands</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {FEATURED_BRANDS.map((brand) => (
            <div key={brand} className="rounded-2xl border border-black/10 bg-white/80 p-4 text-center text-sm shadow-sm dark:border-white/10 dark:bg-[#151822]">
              {brand}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-3xl">Trending Event Outfits</h2>
          <Link href="/marketplace" className="text-sm opacity-70 hover:opacity-100">
            View all
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <Link
              key={category}
              href={`/marketplace?category=${category}`}
              className="rounded-full border border-black/15 px-4 py-1.5 text-xs uppercase tracking-wide dark:border-white/20"
            >
              {category}
            </Link>
          ))}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(trendingItems.length ? trendingItems : featuredItems).map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-3xl border border-black/10 p-6 dark:border-white/10 md:p-8">
        <h2 className="font-serif text-3xl">How It Works</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl bg-black/[0.03] p-4 dark:bg-white/[0.04]">
            <p className="text-xs uppercase tracking-[0.18em] opacity-65">01</p>
            <h3 className="mt-2 font-semibold">Browse curated luxury</h3>
            <p className="mt-1 text-sm opacity-75">Filter by size, brand, date, and pricing to match your exact event needs.</p>
          </article>
          <article className="rounded-2xl bg-black/[0.03] p-4 dark:bg-white/[0.04]">
            <p className="text-xs uppercase tracking-[0.18em] opacity-65">02</p>
            <h3 className="mt-2 font-semibold">Book with protected deposit</h3>
            <p className="mt-1 text-sm opacity-75">Secure checkout holds deposit and confirms your rental instantly.</p>
          </article>
          <article className="rounded-2xl bg-black/[0.03] p-4 dark:bg-white/[0.04]">
            <p className="text-xs uppercase tracking-[0.18em] opacity-65">03</p>
            <h3 className="mt-2 font-semibold">Return and release payout</h3>
            <p className="mt-1 text-sm opacity-75">Admin-confirmed returns trigger deposit release and automatic seller payout.</p>
          </article>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-3xl">Trust & Security</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <ShieldCheck className="size-5" />
            <p className="mt-2 text-sm font-semibold">Verified sellers</p>
          </div>
          <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <Wallet className="size-5" />
            <p className="mt-2 text-sm font-semibold">Deposit protection</p>
          </div>
          <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <Truck className="size-5" />
            <p className="mt-2 text-sm font-semibold">Tracked returns</p>
          </div>
          <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <Sparkles className="size-5" />
            <p className="mt-2 text-sm font-semibold">Premium QA checks</p>
          </div>
        </div>
      </section>

      <section className="mt-12 rounded-3xl border border-black/10 p-6 dark:border-white/10 md:p-8">
        <h2 className="font-serif text-3xl">Testimonials</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <blockquote className="rounded-2xl bg-black/[0.03] p-4 text-sm dark:bg-white/[0.04]">
            &ldquo;My gala outfit arrived pristine and on schedule. Seamless experience.&rdquo;
            <footer className="mt-2 text-xs uppercase tracking-wide opacity-60">Sophia M.</footer>
          </blockquote>
          <blockquote className="rounded-2xl bg-black/[0.03] p-4 text-sm dark:bg-white/[0.04]">
            &ldquo;Seller dashboard and payout tracking are excellent. It feels enterprise-grade.&rdquo;
            <footer className="mt-2 text-xs uppercase tracking-wide opacity-60">Ava Laurent</footer>
          </blockquote>
          <blockquote className="rounded-2xl bg-black/[0.03] p-4 text-sm dark:bg-white/[0.04]">
            &ldquo;I rent for events and resell older pieces in one place. Exactly what I needed.&rdquo;
            <footer className="mt-2 text-xs uppercase tracking-wide opacity-60">Jordan K.</footer>
          </blockquote>
        </div>
      </section>
    </main>
  );
}
