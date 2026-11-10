import { getProduct, type ProductDetail } from "@/backend/actions/catalog.actions";
import Link from "next/link";
import { formatCurrency } from "@/backend/lib/utils";
import { Heart, ShoppingBag, Mail, Phone, MapPin, Star, ChevronRight } from "lucide-react";

type SearchParams = Promise<{ slug?: string }>;

function stars(rating: number | null) {
  const r = rating ?? 0;
  return Array.from({ length: 5 }, (_, i) => ({
    filled: i < Math.round(r),
    half: i === Math.floor(r) && r % 1 >= 0.5,
  }));
}

function formatDiscount(original: number, current: number) {
  if (!original || original <= current) return null;
  return Math.round(((original - current) / original) * 100);
}

export default async function ProductPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const slug = searchParams.slug;

  let product: ProductDetail | null = null;
  let error: string | null = null;

  try {
    const result = await getProduct({ slug: slug ?? "" });
    product = result.product;
  } catch (err: any) {
    error = err?.message ?? "Product not found";
  }

  if (error || !product) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="rounded-2xl border border-black/10 bg-white p-8 text-center dark:border-white/10 dark:bg-[#151822]">
          <h1 className="text-2xl font-bold text-black dark:text-white">{error || "Product not found"}</h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            The product you&rsquo;re looking for doesn&rsquo;t exist or is no longer available.
          </p>
          <Link href="/" className="mt-4 inline-block rounded-full bg-[#F68B1E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#e07d18]">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  const primaryImage = product.images.find((i) => i.isPrimary) ?? product.images[0];
  const variantPrices = product.variants.filter((v) => v.price !== null).map((v) => v.price!);
  const displayPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : product.basePrice;
  const discount = formatDiscount(product.basePrice, displayPrice);
  const totalStock = product.variants.reduce((acc, v) => acc + v.stock, 0);
  const lowStock = totalStock > 0 && totalStock <= 3;
  const avgRating = product.averageRating;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <nav className="mb-6 text-sm text-black/60 dark:text-white/60">
        <Link href="/" className="hover:text-[#c25e30]">Home</Link>
        <span className="mx-1 opacity-50">/</span>
        <Link href={`/marketplace?category=${product.category?.slug}`} className="hover:text-[#c25e30]">
          {product.category?.name ?? "Shop"}
        </Link>
        <span className="mx-1 opacity-50">/</span>
        <span className="text-black dark:text-white">{product.title}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Image Gallery */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-black/5 bg-black/5 dark:border-white/10 dark:bg-white/5">
            {primaryImage?.url ? (
              <img
                src={primaryImage.url}
                alt={product.title}
                className="object-cover w-full h-full"
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

          <div className="grid grid-cols-4 gap-2">
            {product.images.slice(0, 4).map((img) => (
              <button
                key={img.id}
                onClick={() => {}}
                className={`aspect-square overflow-hidden rounded-xl border-2 transition ${
                  img.isPrimary ? "border-[#c25e30]" : "border-black/5 hover:border-black/20 dark:border-white/10 dark:hover:border-white/5"
                }`}
              >
                <img src={img.url} alt="" className="object-cover w-full h-full" />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-black/60 dark:text-white/60">
                {product.vendor.businessName}
              </p>
              <h1 className="font-serif text-3xl font-bold text-black dark:text-white">{product.title}</h1>
              {product.shortDescription && (
                <p className="mt-2 text-sm text-black/70 dark:text-white/70">{product.shortDescription}</p>
              )}
            </div>

            <div className="flex flex-col items-end lg:items-start">
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[#c25e30]">{formatCurrency(displayPrice)}</p>
                {product.basePrice > displayPrice && (
                  <p className="text-base line-through text-black/40 dark:text-white/40">{formatCurrency(product.basePrice)}</p>
                )}
                {discount && (
                  <span className="text-xs font-semibold text-[#c25e30]">Save {discount}%</span>
                )}
              </div>
              {lowStock ? (
                <p className="mt-1 text-xs font-semibold text-[#c25e30]">Only {totalStock} left in stock</p>
              ) : (
                <p className="mt-1 text-xs text-green-600">In stock</p>
              )}
              <p className="mt-2 text-xs text-black/50 dark:text-white/50">
                Sold and delivered by {product.vendor.businessName}
              </p>
            </div>
          </div>

          {/* Variant Selector */}
          {product.variants.length > 1 && (
            <section className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-[#151822]">
              <p className="text-xs font-semibold uppercase tracking-widest text-black/60 dark:text-white/60 mb-3">
                Choose variant
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {product.variants.map((v) => {
                  const label = [v.size, v.color, v.storage].filter(Boolean).join(" / ");
                  return (
                    <button
                      key={v.id}
                      disabled={v.stock === 0}
                      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border text-xs transition ${
                        v.stock === 0
                          ? "border-dashed border-black/20 opacity-50 dark:border-white/20"
                          : "border-black/10 hover:border-[#c25e30] hover:bg-[#c25e30]/10 dark:border-white/10 dark:hover:border-white/20"
                      }`}
                    >
                      <span className="font-medium">{label}</span>
                      <span className="text-[10px] opacity-60">
                        {v.stock === 0 ? "Out of stock" : `KES ${(v.price ?? product.basePrice).toLocaleString()}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Vendor Card */}
          <section className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-[#151822]">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-black/5 dark:bg-white/5">
                <span className="text-xs font-bold text-black/60 dark:text-white/60">
                  {product.vendor.businessName.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-black dark:text-white">{product.vendor.businessName}</p>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`size-3 ${star <= Math.round(product.vendor.rating ?? 0) ? "fill-[#ffbf00] text-[#ffbf00]" : "text-black/20"}`}
                    >
                      ★
                    </span>
                  ))}
                  <span className="text-xs text-black/50 dark:text-white/50 ml-1">
                    ({product.vendor.totalReviews})
                  </span>
                </div>
                <p className="text-xs text-black/60 dark:text-white/60 mt-1">
                  {product.vendor.verificationStatus === "verified" ? "Verified seller" : "Seller"}
                  {product.vendor.county ? ` &bull; ${product.vendor.county}` : ""}
                </p>
              </div>
              <div className="flex-shrink-0">
                <button className="flex items-center gap-2 rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5">
                  <Heart className="size-4" />
                  <span>Follow</span>
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-1">
                <Mail className="size-4 text-black/40" />
                <span>{product.vendor.businessEmail ?? "Contact via platform"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Phone className="size-4 text-black/40" />
                <span>{product.vendor.businessPhone ?? "—"}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="size-4 text-black/40" />
                <span>
                  {product.vendor.town ?? ""} {product.vendor.county ?? ""}
                </span>
              </div>
            </div>
          </section>

          {/* Description */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-black/60 dark:text-white/60 mb-2">
              Product Details
            </p>
            <p className="text-black/70 dark:text-white/70 leading-relaxed">
              {product.description}
            </p>
            {product.weightG && (
              <p className="mt-2 text-xs text-black/50 dark:text-white/50">
                Weight: {product.weightG}g
              </p>
            )}
            {product.dimensionsCm && (
              <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                Dimensions: {product.dimensionsCm} cm
              </p>
            )}
          </section>

          {/* Reviews */}
          {product.reviewCount > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-black/60 dark:text-white/60">
                    Customer Reviews
                  </p>
                  <p className="text-sm font-medium text-black dark:text-white">
                    {avgRating?.toFixed(1)} ({product.reviewCount})
                  </p>
                </div>
                <Link href="#" className="text-xs text-[#c25e30] hover:underline">
                  Write a review
                </Link>
              </div>
              <div className="flex items-center gap-4 mb-6">
                <span className="text-4xl font-bold text-black dark:text-white">{avgRating?.toFixed(1) ?? "0.0"}</span>
                <div className="flex gap-0.5">
                  {stars(avgRating).map((s, i) => (
                    <span
                      key={i}
                      className={`size-4 ${s.filled ? "fill-[#ffbf00] text-[#ffbf00]" : s.half ? "fill-[#ffbf00]/50 text-[#ffbf00]/50" : "text-black/20"}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                {product.reviews.map((review) => (
                  <div key={review.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-black/60 dark:text-white/60">
                          {review.user.name?.charAt(0) ?? "U"}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-black dark:text-white">{review.user.name ?? "Customer"}</p>
                        <p className="text-[10px] text-black/40 dark:text-white/40">
                          {review.isVerifiedPurchase ? "Verified Purchase &bull; " : ""}
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {review.title && <p className="text-sm font-medium text-black dark:text-white">{review.title}</p>}
                    <p className="text-sm text-black/70 dark:text-white/70">{review.comment}</p>
                    {review.photos.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {review.photos.map((photo, idx) => (
                          <img key={idx} src={photo} alt="" className="w-16 h-16 object-cover rounded-lg" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Customers Also Viewed */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-black/60 dark:text-white/60 mb-3">
              Customers also viewed
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="group flex flex-col">
                  <div className="relative aspect-square overflow-hidden rounded-xl border border-black/5 bg-black/5 dark:border-white/10 dark:bg-white/5">
                    <div className="grid h-full place-content-center text-sm opacity-60">No image</div>
                  </div>
                  <h4 className="mt-2 line-clamp-1 text-sm font-medium text-black dark:text-white">
                    Related product {i}
                  </h4>
                  <p className="text-sm font-semibold text-[#c25e30]">KES 5,000</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
