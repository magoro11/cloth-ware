import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Wallet,
} from "lucide-react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { APP_NAME, APP_TAGLINE, CATEGORIES, FEATURED_BRANDS } from "@/lib/constants";
import { AnimatedHeroGallery } from "@/components/animated-hero-gallery";
import { ItemCard } from "@/components/item-card";
import { databaseErrorMessage, isDatabaseUnavailable, logDatabaseIssue } from "@/lib/errors";

export const dynamic = "force-dynamic";

type ItemWithRelations = Prisma.ItemGetPayload<{
  include: { images: true; owner: { select: { role: true } }; reviews: true };
}>;

const serviceHighlights = [
  {
    title: "Luxury rentals",
    description: "Book event-ready outfits with protected deposits, tracked returns, and calendar-based availability.",
    icon: Clock3,
  },
  {
    title: "Resale support",
    description: "Turn underused designer pieces into income with seller controls, pricing visibility, and streamlined payouts.",
    icon: BadgeDollarSign,
  },
  {
    title: "Managed quality",
    description: "Item presentation, condition standards, and trust checks keep every order polished and predictable.",
    icon: ShieldCheck,
  },
] as const;

const audienceCards = [
  {
    eyebrow: "For stylists",
    title: "Build event wardrobes faster",
    description: "Source polished looks for weddings, corporate shoots, and private styling clients without chasing multiple vendors.",
    icon: Building2,
    href: "/marketplace?q=Events",
  },
  {
    eyebrow: "For campuses",
    title: "Affordable access to standout fashion",
    description: "Formal nights, graduations, and student events become easier to plan with flexible pricing and high-end inventory.",
    icon: GraduationCap,
    href: "/marketplace?q=Graduation",
  },
  {
    eyebrow: "For sellers",
    title: "Monetize closets with confidence",
    description: "List premium items once, keep them visible year-round, and manage deposits, bookings, and conversations in one place.",
    icon: Sparkles,
    href: "/list-item",
  },
] as const;

const processSteps = [
  {
    step: "01",
    title: "Browse verified looks",
    description: "Search by category, event, and style to find pieces with clear pricing, condition, and availability.",
  },
  {
    step: "02",
    title: "Reserve with protected checkout",
    description: "Secure your rental with transparent deposit handling, checkout guidance, and direct seller communication.",
  },
  {
    step: "03",
    title: "Return smoothly and unlock payout",
    description: "Tracked returns and review workflows help renters close orders cleanly while sellers receive confirmed payouts.",
  },
] as const;

const trustItems = [
  { title: "Verified sellers", icon: ShieldCheck },
  { title: "Deposit protection", icon: Wallet },
  { title: "Tracked returns", icon: Truck },
  { title: "Premium QA checks", icon: CheckCircle2 },
] as const;

const testimonials = [
  {
    quote: "I needed one place where premium rentals still felt dependable. This finally gives me that confidence.",
    author: "Sophia M.",
  },
  {
    quote: "The structure feels polished for both customers and sellers, especially around deposits and booking flow.",
    author: "Ava Laurent",
  },
  {
    quote: "I can rent for events, list older pieces, and manage conversations without juggling separate tools.",
    author: "Jordan K.",
  },
] as const;

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
  } catch (error) {
    featuredItems = [];
    trendingItems = [];
    isDatabaseUnavailable(error);
    databaseErrorMessage(error);
    logDatabaseIssue("Home page database query failed", error);
  }

  const showcaseItems = featuredItems.length ? featuredItems : trendingItems;
  const momentumItems = trendingItems.length ? trendingItems : featuredItems;
  const animatedHeroImages = [...showcaseItems, ...momentumItems]
    .flatMap((item) =>
      item.images
        .filter((image) => image.url)
        .map((image) => ({
          src: image.url,
          alt: item.title,
        })),
    )
    .slice(0, 6);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-[linear-gradient(140deg,#f8f1e6_0%,#f4eadf_48%,#ece2d4_100%)] px-6 py-8 shadow-[0_30px_80px_-50px_rgba(87,51,14,0.55)] section-enter dark:border-white/10 dark:bg-[linear-gradient(140deg,#171924_0%,#121722_50%,#10131d_100%)] md:px-10 md:py-12">
        <AnimatedHeroGallery images={animatedHeroImages} />
        <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-[#d39c5f]/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-64 w-64 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.55),transparent_62%)] dark:bg-[radial-gradient(circle_at_center,rgba(241,202,150,0.14),transparent_62%)]" />
        <div className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(90deg,rgba(248,241,230,0.2),rgba(248,241,230,0)_35%)] dark:bg-[linear-gradient(90deg,rgba(23,25,36,0.16),rgba(23,25,36,0)_35%)]" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/55 dark:text-white/55">{APP_NAME}</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-4 py-2 text-xs font-medium text-black/70 backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-white/70">
              <span className="inline-flex size-2 rounded-full bg-[#bb7a34]" />
              Trusted luxury fashion rental and resale
            </div>
            <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[0.94] tracking-[-0.03em] md:text-7xl">
              Rent statement looks. Resell with a marketplace that feels premium.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-black/70 dark:text-white/72">
              {APP_TAGLINE} Designed for renters, stylists, and sellers who need confidence before checkout.
            </p>

            <form
              action="/marketplace"
              className="mt-8 rounded-[1.75rem] border border-black/10 bg-white/88 p-3 shadow-lg shadow-black/5 backdrop-blur dark:border-white/10 dark:bg-[#111622]/88"
            >
              <div className="grid gap-3 md:grid-cols-[1.6fr,0.95fr,0.95fr,auto]">
                <label className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 dark:border-white/10">
                  <Search className="size-4 opacity-60" />
                  <input
                    name="q"
                    placeholder="Search dresses, suits, gala looks, wedding edits..."
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </label>
                <select name="category" className="rounded-2xl border border-black/10 bg-transparent px-4 py-3 text-sm dark:border-white/10">
                  <option value="">All categories</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <select name="sort" defaultValue="latest" className="rounded-2xl border border-black/10 bg-transparent px-4 py-3 text-sm dark:border-white/10">
                  <option value="latest">New arrivals</option>
                  <option value="popularity">Popularity</option>
                  <option value="price_asc">Price: Low to high</option>
                </select>
                <button className="rounded-2xl bg-[#1f2430] px-6 py-3 text-sm font-medium text-white transition hover:bg-black dark:bg-[#f4e6d5] dark:text-[#10131d]">
                  Search
                </button>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/marketplace" className="inline-flex items-center gap-2 rounded-full bg-[#1f2430] px-6 py-3 text-sm font-medium text-white transition hover:bg-black dark:bg-[#f4e6d5] dark:text-[#10131d]">
                Browse Marketplace
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/list-item" className="rounded-full border border-black/15 px-6 py-3 text-sm font-medium transition hover:bg-white/60 dark:border-white/15 dark:hover:bg-white/5">
                List Your Item
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-black/10 bg-white/65 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
                <p className="text-2xl font-semibold">30K+</p>
                <p className="mt-1 text-sm text-black/65 dark:text-white/65">Sellers, stylists, and shoppers we are built to support at scale.</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white/65 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
                <p className="text-2xl font-semibold">140+</p>
                <p className="mt-1 text-sm text-black/65 dark:text-white/65">Event and style needs covered through versatile categories and filters.</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white/65 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
                <p className="text-2xl font-semibold">4.9/5</p>
                <p className="mt-1 text-sm text-black/65 dark:text-white/65">Customer-first experience built around trust, polish, and responsive support.</p>
              </div>
            </div>
          </div>

          <div className="relative grid gap-4">
            <div className="rounded-[1.75rem] border border-black/10 bg-[#1f2430]/90 p-6 text-white shadow-xl shadow-black/10 backdrop-blur-sm dark:border-white/10">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Most popular</p>
              <h2 className="mt-3 font-serif text-3xl">Luxury marketplace with trust built in</h2>
              <p className="mt-3 text-sm leading-6 text-white/72">
                Premium discovery, deposit handling, and seller workflows packaged into one refined shopping experience.
              </p>
              <div className="mt-6 space-y-3">
                {serviceHighlights.map(({ title, description, icon: Icon }) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      <Icon className="size-5 text-[#f1c78d]" />
                      <p className="font-medium">{title}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/68">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-black/10 bg-white/84 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-xs uppercase tracking-[0.2em] text-black/55 dark:text-white/55">Trusted by teams</p>
                <div className="mt-4 flex flex-wrap gap-2 text-sm font-medium">
                  {["Stylists", "Bridal parties", "Campus events", "Fashion resellers"].map((label) => (
                    <span key={label} className="rounded-full border border-black/10 px-3 py-1.5 dark:border-white/10">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-black/10 bg-white/84 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-xs uppercase tracking-[0.2em] text-black/55 dark:text-white/55">Fast actions</p>
                <div className="mt-4 space-y-3 text-sm">
                  <Link href="/marketplace?q=Wedding" className="flex items-center justify-between rounded-2xl bg-black/[0.04] px-4 py-3 dark:bg-white/[0.05]">
                    Wedding edit
                    <ArrowRight className="size-4 opacity-60" />
                  </Link>
                  <Link href="/marketplace?q=Corporate" className="flex items-center justify-between rounded-2xl bg-black/[0.04] px-4 py-3 dark:bg-white/[0.05]">
                    Corporate looks
                    <ArrowRight className="size-4 opacity-60" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 section-enter">
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-black/45 dark:text-white/45">
          <span>Trusted labels</span>
          {FEATURED_BRANDS.map((brand) => (
            <span key={brand} className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-[11px] font-medium text-black/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
              {brand}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-3 section-enter">
        {audienceCards.map(({ eyebrow, title, description, icon: Icon, href }) => (
          <article key={title} className="rounded-[1.75rem] border border-black/10 bg-white/75 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-black/50 dark:text-white/50">{eyebrow}</p>
              <Icon className="size-5 text-[#b97834]" />
            </div>
            <h2 className="mt-4 font-serif text-3xl leading-tight">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-black/68 dark:text-white/68">{description}</p>
            <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#8f5621] dark:text-[#f1c78d]">
              Learn more
              <ArrowRight className="size-4" />
            </Link>
          </article>
        ))}
      </section>

      <section className="mt-14 section-enter">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-black/50 dark:text-white/50">Featured selection</p>
            <h2 className="mt-2 font-serif text-4xl">Shop standout looks with clear expectations</h2>
          </div>
          <Link href="/marketplace" className="hidden text-sm font-medium text-black/65 hover:text-black dark:text-white/65 dark:hover:text-white md:block">
            View all listings
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
          {showcaseItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-6 lg:grid-cols-[0.85fr,1.15fr] section-enter">
        <div className="rounded-[1.8rem] border border-black/10 bg-[#1d2230] p-7 text-white dark:border-white/10">
          <p className="text-xs uppercase tracking-[0.2em] text-white/55">Why choose us</p>
          <h2 className="mt-3 font-serif text-4xl leading-tight">A marketplace designed to feel polished before and after checkout</h2>
          <p className="mt-4 text-sm leading-7 text-white/70">
            The structure mirrors how people actually shop for special moments: confidence first, details second, and support throughout.
          </p>
          <div className="mt-6 space-y-4">
            {[
              "Transparent pricing before booking",
              "Clear condition and trust signals",
              "Dedicated paths for renters and sellers",
              "Business-ready workflows for repeat use",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <CheckCircle2 className="mt-0.5 size-4 text-[#f1c78d]" />
                <p className="text-sm text-white/75">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-black/10 bg-white/75 p-7 dark:border-white/10 dark:bg-white/5">
          <p className="text-xs uppercase tracking-[0.2em] text-black/50 dark:text-white/50">Momentum now</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-serif text-4xl leading-tight">Trending items and quick-entry collections</h2>
            <Link href="/marketplace?sort=popularity" className="text-sm font-medium text-[#8f5621] dark:text-[#f1c78d]">
              Explore trends
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Women", "Men", "Events", "Casual", "Office", "Wedding", "Party"].map((collection) => (
              <Link
                key={collection}
                href={`/marketplace?q=${encodeURIComponent(collection)}`}
                className="rounded-full border border-black/15 px-4 py-1.5 text-xs uppercase tracking-wide dark:border-white/20"
              >
                {collection}
              </Link>
            ))}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {momentumItems.slice(0, 4).map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-14 rounded-[1.9rem] border border-black/10 bg-white/70 p-6 dark:border-white/10 dark:bg-white/5 md:p-8 section-enter">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-black/50 dark:text-white/50">How it works</p>
          <h2 className="mt-2 font-serif text-4xl">Simple, premium, and clear from discovery to return</h2>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {processSteps.map(({ step, title, description }) => (
            <article key={step} className="rounded-[1.5rem] bg-black/[0.035] p-5 dark:bg-white/[0.04]">
              <p className="text-xs uppercase tracking-[0.18em] opacity-55">{step}</p>
              <h3 className="mt-3 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-7 opacity-75">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-14 section-enter">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-black/50 dark:text-white/50">Trust and security</p>
            <h2 className="mt-2 font-serif text-4xl">Confidence cues that make premium rentals feel usable</h2>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {trustItems.map(({ title, icon: Icon }) => (
            <div key={title} className="rounded-[1.5rem] border border-black/10 bg-white/72 p-5 dark:border-white/10 dark:bg-white/5">
              <Icon className="size-5 text-[#b97834]" />
              <p className="mt-3 text-sm font-semibold">{title}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 rounded-[1.9rem] border border-black/10 bg-[linear-gradient(135deg,#f4ead9_0%,#f8f1e7_50%,#efe4d5_100%)] p-6 dark:border-white/10 dark:bg-[linear-gradient(135deg,#171b27_0%,#121723_48%,#10141d_100%)] md:p-8 section-enter">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-black/50 dark:text-white/50">Testimonials</p>
            <h2 className="mt-2 font-serif text-4xl">People remember how confident the experience felt</h2>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm dark:border-white/10 dark:bg-white/5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Sparkles key={index} className="size-3.5 text-[#b97834]" />
            ))}
            <span className="ml-2">4.9/5 customer satisfaction</span>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {testimonials.map(({ quote, author }) => (
            <blockquote key={author} className="rounded-[1.5rem] border border-black/10 bg-white/72 p-5 text-sm leading-7 dark:border-white/10 dark:bg-white/5">
              &ldquo;{quote}&rdquo;
              <footer className="mt-4 text-xs font-medium uppercase tracking-[0.18em] opacity-60">{author}</footer>
            </blockquote>
          ))}
        </div>
      </section>
    </main>
  );
}
