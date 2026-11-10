import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/backend/lib/utils";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { WishlistButton } from "@/frontend/components/wishlist-button";
import { ProductCard } from "@/frontend/components/product-card";
import { Star, Truck, ShieldCheck, RefreshCcw, Minus, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  category?: string;
  sort?: string;
}>;

export default async function ProductDetailPage(props: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const params = await props.params;
  const session = await auth();

  let product: any = null;
  let relatedProducts: any[] = [];
  let wishlisted = false;
  let inCart = false;

  try {
    product = await prisma.product.findUnique({
      where: { id: params.id, isPublished: true },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: { where: { isActive: true }, orderBy: { price: "asc" } },
        category: true,
        seller: { select: { name: true, id: true } },
        reviews: {
          include: { author: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (product) {
      const [related, wishlistEntry, cartEntry] = await Promise.all([
        prisma.product.findMany({
          where: { categoryId: product.categoryId, isPublished: true, id: { not: product.id } },
          include: { images: { take: 1 }, variants: { where: { isActive: true } } },
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
        session?.user
          ? prisma.wishlistItem.findFirst({ where: { userId: session.user.id, productId: product.id } })
          : Promise.resolve(null),
        session?.user
          ? (async () => {
              const cart = await prisma.storeCart.findFirst({
                where: { userId: session.user.id },
                select: { id: true },
              });
              if (!cart) return null;
              return prisma.storeCartItem.findFirst({
                where: {
                  cartId: cart.id,
                  variantId: { in: product.variants.map((v: any) => v.id) },
                },
                select: { id: true },
              });
            })()
          : Promise.resolve(null),
      ]);
      relatedProducts = related;
      wishlisted = Boolean(wishlistEntry);
      inCart = Boolean(cartEntry);
    }
  } catch {
    product = null;
    relatedProducts = [];
  }

  if (!product) {
    notFound();
  }

  const averageRating = product.reviews.length
    ? (product.reviews.reduce((acc: number, review: any) => acc + review.rating, 0) / product.reviews.length).toFixed(1)
    : null;

  const primaryImage = product.images[0]?.url ?? null;
  const minPrice = product.variants.length > 0
    ? Math.min(...product.variants.map((v: any) => v.price ?? product.basePrice))
    : product.basePrice;
  const maxPrice = product.variants.length > 0
    ? Math.max(...product.variants.map((v: any) => v.price ?? product.basePrice))
    : product.basePrice;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <nav className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
        <Link href="/" className="hover:opacity-70">Home</Link>
        <span>/</span>
        <Link href="/marketplace" className="hover:opacity-70">Shop</Link>
        {product.category && (
          <>
            <span>/</span>
            <Link href={`/marketplace?category=${product.category.slug}`} className="hover:opacity-70">{product.category.name}</Link>
          </>
        )}
        <span>/</span>
        <span className="text-black dark:text-white truncate max-w-[200px]">{product.brand} {product.title}</span>
      </nav>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-black/5 bg-black/5 dark:border-white/10 dark:bg-white/5">
            {primaryImage ? (
              <Image src={primaryImage} alt={product.title} fill className="object-cover" unoptimized />
            ) : (
              <div className="grid h-full place-content-center text-sm opacity-60">No image</div>
            )}
            <div className="absolute right-3 top-3">
              <WishlistButton itemId={product.id} initialWishlisted={wishlisted} className="rounded-full bg-white/90 p-2 backdrop-blur dark:bg-black/60" />
            </div>
          </div>

          {product.images.length > 1 ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((image: any) => (
                <div key={image.id} className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                  <Image src={image.url} alt={product.title} fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-60">{product.brand}</p>
            <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-black dark:text-white">{product.title}</h1>
            <div className="mt-2 flex items-center gap-2 text-sm">
              {averageRating ? (
                <span className="flex items-center gap-1 rounded bg-[#ffbf00] px-1.5 py-0.5 text-white">
                  <Star className="size-3 fill-white" />
                  {averageRating}
                </span>
              ) : null}
              <span className="text-black/50 dark:text-white/50">({product.reviews.length} review{product.reviews.length !== 1 ? "s" : ""})</span>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 p-4 dark:border-white/10">
            <p className="text-xs font-medium text-black/60 dark:text-white/60">Price</p>
            {minPrice === maxPrice ? (
              <p className="mt-1 text-3xl font-bold text-[#c25e30]">{formatCurrency(minPrice)}</p>
            ) : (
              <p className="mt-1 text-3xl font-bold text-[#c25e30]">
                {formatCurrency(minPrice)} - {formatCurrency(maxPrice)}
              </p>
            )}
            <p className="mt-1 text-xs text-black/60 dark:text-white/60">Incl. taxes · Shipping calculated at checkout</p>
          </div>

          {/* Variant Selector */}
          {product.variants.length > 0 && (
            <div className="space-y-3 rounded-2xl border border-black/5 p-4 dark:border-white/10">
              <p className="text-xs font-medium text-black/60 dark:text-white/60">Select Options</p>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs font-medium text-black/60 dark:text-white/60">Size</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(Array.from(new Set(product.variants.map((v: any) => v.size))) as string[]).map((size) => (
                      <button
                        key={size}
                        type="button"
                        className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                {(Array.from(new Set(product.variants.map((v: any) => v.color))) as string[]).filter(Boolean).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-black/60 dark:text-white/60">Color</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(Array.from(new Set(product.variants.map((v: any) => v.color))) as string[]).filter(Boolean).map((color) => (
                        <button
                          key={color}
                          type="button"
                          className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {(Array.from(new Set(product.variants.map((v: any) => v.fabric))) as string[]).filter(Boolean).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-black/60 dark:text-white/60">Fabric</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(Array.from(new Set(product.variants.map((v: any) => v.fabric))) as string[]).filter(Boolean).map((fabric) => (
                        <button
                          key={fabric}
                          type="button"
                          className="rounded-lg border border-black/10 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                        >
                          {fabric}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-black/5 p-3 text-center dark:border-white/10">
              <Truck className="mx-auto size-5 text-black/60 dark:text-white/60" />
              <p className="mt-1 text-xs font-medium">Free Delivery</p>
            </div>
            <div className="rounded-xl border border-black/5 p-3 text-center dark:border-white/10">
              <ShieldCheck className="mx-auto size-5 text-black/60 dark:text-white/60" />
              <p className="mt-1 text-xs font-medium">Secure Checkout</p>
            </div>
            <div className="rounded-xl border border-black/5 p-3 text-center dark:border-white/10">
              <RefreshCcw className="mx-auto size-5 text-black/60 dark:text-white/60" />
              <p className="mt-1 text-xs font-medium">30-Day Returns</p>
            </div>
          </div>

          <div className="space-y-3">
            <AddToCartButton itemId={product.id} inCart={inCart} className="w-full rounded-xl bg-[#F68B1E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#e07d18]" />
            <Link href="/cart" className="block w-full rounded-xl border border-black/10 px-4 py-3 text-center text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
              View Cart
            </Link>
          </div>

          <div className="rounded-2xl border border-black/5 p-4 dark:border-white/10">
            <h3 className="text-sm font-semibold text-black dark:text-white">Product Details</h3>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-black/60 dark:text-white/60">Garment Type</dt>
                <dd className="font-medium text-black dark:text-white">{product.garmentType || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-black/60 dark:text-white/60">Category</dt>
                <dd className="font-medium text-black dark:text-white">{product.category?.name || "General"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-black/60 dark:text-white/60">Brand</dt>
                <dd className="font-medium text-black dark:text-white">{product.brand}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-black/60 dark:text-white/60">Seller</dt>
                <dd className="font-medium text-black dark:text-white">{product.seller.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-black/60 dark:text-white/60">Variants</dt>
                <dd className="font-medium text-black dark:text-white">{product.variants.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-black/60 dark:text-white/60">Total Stock</dt>
                <dd className="font-medium text-black dark:text-white">
                  {product.variants.reduce((sum: number, v: any) => sum + v.stock, 0)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-black/5 p-4 dark:border-white/10">
            <h3 className="text-sm font-semibold text-black dark:text-white">Description</h3>
            <p className="mt-2 text-xs leading-6 text-black/70 dark:text-white/70">{product.description}</p>
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 ? (
        <section className="mt-14">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">You May Also Like</h2>
            <Link href={`/marketplace?category=${product.category?.slug}`} className="text-sm font-semibold text-[#c25e30] hover:opacity-70">See All</Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {relatedProducts.map((related) => (
              <ProductCard key={related.id} product={related} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}