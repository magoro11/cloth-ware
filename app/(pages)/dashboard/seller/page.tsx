import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/backend/lib/utils";
import { SellerListingActions } from "@/frontend/components/seller-listing-actions";
import { SellerBookingActions } from "@/frontend/components/seller-booking-actions";
import { BookingStatusBadge } from "@/frontend/components/booking-status-badge";
import { TrendingUp, TrendingDown, Package, DollarSign, ShoppingBag, AlertCircle } from "lucide-react";

const prismaAny = prisma as any;

export const dynamic = "force-dynamic";

export default async function SellerDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  if (session.user.role === "CUSTOMER") redirect("/dashboard/user");
  if (session.user.role === "ADMIN") redirect("/dashboard/admin");

  const [
    listings,
    orders,
    products,
    productOrders,
    payouts,
  ] = await Promise.all([
    prismaAny.item.findMany({
      where: { ownerId: session.user.id },
      include: { bookings: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prismaAny.booking.findMany({
      where: { item: { ownerId: session.user.id } },
      include: {
        customer: { select: { name: true, email: true } },
        item: { select: { title: true, brand: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prismaAny.product.findMany({
      where: { sellerId: session.user.id },
      include: { variants: true, images: { take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prismaAny.order.findMany({
      where: { items: { some: { product: { sellerId: session.user.id } } } },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: { product: { select: { title: true } }, variant: { select: { sku: true, size: true, color: true } } },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prismaAny.payout.findMany({
      where: { ownerId: session.user.id },
      include: { booking: { include: { item: { select: { title: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  // Rental calculations
  const grossRentalRevenue = orders
    .filter((o: any) => ["CONFIRMED", "ACTIVE", "LATE", "COMPLETED"].includes(o.status))
    .reduce((acc: number, o: any) => acc + o.rentalAmount, 0);

  const rentalPayoutProjection = orders
    .filter((o: any) => ["CONFIRMED", "ACTIVE", "LATE", "COMPLETED"].includes(o.status))
    .reduce((acc: number, o: any) => acc + o.ownerPayoutAmount, 0);

  const pendingRentalOrders = orders.filter((o: any) =>
    ["PENDING", "CONFIRMED", "ACTIVE", "LATE"].includes(o.status),
  );
  const pastRentalOrders = orders.filter((o: any) =>
    ["COMPLETED", "CANCELED"].includes(o.status),
  );

  // Product/E-commerce calculations
  const completedProductOrders = productOrders.filter((o: any) => ["PAID", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].includes(o.status));
  const grossProductRevenue = completedProductOrders.reduce((acc: number, o: any) => acc + o.total, 0);
  const productCommission = completedProductOrders.reduce((acc: number, o: any) => {
    const orderCommission = o.items
      .filter((item: any) => item.product.sellerId === session.user.id)
      .reduce((sum: number, item: any) => sum + Math.round(item.price * item.quantity * 0.1), 0);
    return acc + orderCommission;
  }, 0);
  const productPayoutProjection = grossProductRevenue - productCommission;

  const pendingProductOrders = productOrders.filter((o: any) => ["PENDING", "PAID", "CONFIRMED", "PROCESSING"].includes(o.status));
  const totalProducts = products.length;
  const totalVariants = products.reduce((acc: number, p: any) => acc + p.variants.length, 0);
  const lowStockVariants = products.flatMap((p: any) => p.variants).filter((v: any) => v.stock <= 5 && v.stock > 0).length;
  const outOfStockVariants = products.flatMap((p: any) => p.variants).filter((v: any) => v.stock === 0).length;

  const totalGrossRevenue = grossRentalRevenue + grossProductRevenue;
  const totalPayoutProjection = rentalPayoutProjection + productPayoutProjection;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-4xl">Vendor Dashboard</h1>
          <p className="mt-2 text-sm opacity-70">
            Manage products, inventory, orders, and earnings.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/list-item" className="rounded-lg bg-[#F68B1E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e07d18]">
            Add Product
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 grid gap-3 md:grid-cols-6">
        {[
          { label: "Active Rentals", value: listings.filter((l: any) => l.featured).length, icon: Package, color: "text-blue-500" },
          { label: "Products", value: totalProducts, icon: ShoppingBag, color: "text-purple-500" },
          { label: "Variants", value: totalVariants, icon: Package, color: "text-indigo-500" },
          { label: "Gross Revenue", value: formatCurrency(totalGrossRevenue), icon: DollarSign, color: "text-emerald-500" },
          { label: "Projected Payouts", value: formatCurrency(totalPayoutProjection), icon: TrendingUp, color: "text-teal-500" },
          { label: "Low Stock", value: lowStockVariants, icon: AlertCircle, color: lowStockVariants > 0 ? "text-amber-500" : "text-emerald-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Icon className={`size-5 ${color}`} />
              <p className="text-xs uppercase tracking-wide opacity-65">{label}</p>
            </div>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {/* Revenue Overview */}
      <div className="mt-8 rounded-xl border border-black/10 bg-white p-5 dark:border-white/10">
        <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-black dark:text-white">Revenue Overview</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-black/5 p-3 dark:border-white/10">
            <p className="text-xs text-black/60 dark:text-white/60">Rental Revenue</p>
            <p className="mt-1 text-lg font-bold text-black dark:text-white">{formatCurrency(grossRentalRevenue)}</p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">+8.5% vs last month</p>
          </div>
          <div className="rounded-lg border border-black/5 p-3 dark:border-white/10">
            <p className="text-xs text-black/60 dark:text-white/60">Product Revenue</p>
            <p className="mt-1 text-lg font-bold text-black dark:text-white">{formatCurrency(grossProductRevenue)}</p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">+12% vs last month</p>
          </div>
          <div className="rounded-lg border border-black/5 p-3 dark:border-white/10">
            <p className="text-xs text-black/60 dark:text-white/60">Total Orders</p>
            <p className="mt-1 text-lg font-bold text-black dark:text-white">{orders.length + productOrders.length}</p>
          </div>
          <div className="rounded-lg border border-black/5 p-3 dark:border-white/10">
            <p className="text-xs text-black/60 dark:text-white/60">Pending Payouts</p>
            <p className="mt-1 text-lg font-bold text-black dark:text-white">{formatCurrency(totalPayoutProjection)}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Inventory - Products */}
        <section className="lg:col-span-2 rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl">Product Inventory</h2>
            <Link href="/list-item" className="text-sm underline opacity-75">
              Add Product
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto size-12 opacity-30" />
              <p className="mt-4 text-sm opacity-70">No products yet. Start selling by adding your first product.</p>
              <Link href="/list-item" className="mt-4 inline-block rounded-lg bg-[#F68B1E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e07d18]">
                Add Product
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product: any) => (
                <article key={product.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {product.images[0] ? (
                        <img src={product.images[0].url} alt={product.title} className="size-12 rounded-lg object-cover" />
                      ) : (
                        <div className="size-12 rounded-lg bg-black/5 flex items-center justify-center">
                          <Package className="size-6 opacity-40" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{product.title}</p>
                        <p className="text-xs opacity-65">
                          {product.variants.length} variant{product.variants.length !== 1 ? "s" : ""} · 
                          {product.variants.reduce((sum: number, v: any) => sum + v.stock, 0)} in stock
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                        product.isPublished
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300"
                      }`}>
                        {product.isPublished ? "Live" : "Draft"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link href={`/list-item?id=${product.id}`} className="rounded-lg border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
                      Edit
                    </Link>
                    <Link href={`/marketplace?q=${encodeURIComponent(product.title)}`} className="rounded-lg border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
                      View
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Earnings & Payouts */}
        <section className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-serif text-2xl">Earnings & Payouts</h2>
          <p className="mt-2 text-sm opacity-75">
            Payouts are released after order completion. Connect Stripe for automatic transfers.
          </p>
          
          <div className="mt-4 rounded-xl border border-black/10 p-3 dark:border-white/10">
            <p className="text-xs font-medium text-black/60 dark:text-white/60">Stripe Connect</p>
            <p className="mt-1 text-sm">
              {session.user.stripeConnectedId ? "Connected" : "Not connected"}
            </p>
          </div>

          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold">Recent Payouts</h3>
            {payouts.length === 0 ? (
              <p className="text-sm opacity-70">No payouts yet.</p>
            ) : (
              <div className="space-y-2">
                {payouts.map((payout: any) => (
                  <div key={payout.id} className="flex items-center justify-between rounded-lg bg-black/[0.02] px-3 py-2 dark:bg-white/5">
                    <div>
                      <p className="text-xs font-medium text-black dark:text-white">{payout.booking?.item?.title || "Rental payout"}</p>
                      <p className="text-[11px] text-black/50 dark:text-white/50">{new Date(payout.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-semibold ${payout.status === "RELEASED" ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                      {formatCurrency(payout.amount)} · {payout.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 rounded-xl border border-black/10 p-4 dark:border-white/10">
            <p className="text-xs font-medium text-black/60 dark:text-white/60">Projected Earnings</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-black/60 dark:text-white/60">Rental Payouts</p>
                <p className="font-semibold text-black dark:text-white">{formatCurrency(rentalPayoutProjection)}</p>
              </div>
              <div>
                <p className="text-black/60 dark:text-white/60">Product Payouts</p>
                <p className="font-semibold text-black dark:text-white">{formatCurrency(productPayoutProjection)}</p>
              </div>
              <div>
                <p className="text-black/60 dark:text-white/60">Commission (10%)</p>
                <p className="font-semibold text-black dark:text-white">{formatCurrency(grossRentalRevenue * 0.1 + productCommission)}</p>
              </div>
              <div>
                <p className="text-black/60 dark:text-white/60">Total Projected</p>
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">{formatCurrency(totalPayoutProjection)}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Active Orders - Rentals */}
      {pendingRentalOrders.length > 0 && (
        <section className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl">Active Rental Orders</h2>
            <span className="text-xs opacity-65">{pendingRentalOrders.length} order{pendingRentalOrders.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-black/[0.02] dark:bg-white/5">
                <tr>
                  <th className="px-4 py-2 font-semibold opacity-65">Order</th>
                  <th className="px-4 py-2 font-semibold opacity-65">Customer</th>
                  <th className="px-4 py-2 font-semibold opacity-65">Dates</th>
                  <th className="px-4 py-2 font-semibold opacity-65">Amount</th>
                  <th className="px-4 py-2 font-semibold opacity-65">Status</th>
                  <th className="px-4 py-2 font-semibold opacity-65">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {pendingRentalOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-black/[0.01] dark:hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{order.item.brand} {order.item.title}</p>
                          <p className="opacity-65">{order.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{order.customer.name || order.customer.email}</td>
                    <td className="px-4 py-3 opacity-70">
                      {new Date(order.startDate).toLocaleDateString()} – {new Date(order.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(order.rentalAmount)}</td>
                    <td className="px-4 py-3"><BookingStatusBadge status={order.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/messages?contact=${order.customerId}`} className="rounded-lg border border-black/15 px-3 py-1.5 text-[11px] hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">Chat</Link>
                        <SellerBookingActions bookingId={order.id} status={order.status} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Active Orders - Products */}
      {pendingProductOrders.length > 0 && (
        <section className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl">Active Product Orders</h2>
            <span className="text-xs opacity-65">{pendingProductOrders.length} order{pendingProductOrders.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-black/[0.02] dark:bg-white/5">
                <tr>
                  <th className="px-4 py-2 font-semibold opacity-65">Order</th>
                  <th className="px-4 py-2 font-semibold opacity-65">Customer</th>
                  <th className="px-4 py-2 font-semibold opacity-65">Items</th>
                  <th className="px-4 py-2 font-semibold opacity-65">Total</th>
                  <th className="px-4 py-2 font-semibold opacity-65">Status</th>
                  <th className="px-4 py-2 font-semibold opacity-65">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {pendingProductOrders.map((order: any) => {
                  const sellerItems = order.items.filter((item: any) => item.product.sellerId === session.user.id);
                  return (
                    <tr key={order.id} className="hover:bg-black/[0.01] dark:hover:bg-white/5">
                      <td className="px-4 py-3">
                        <p className="opacity-65">{order.id.slice(0, 8).toUpperCase()}</p>
                      </td>
                      <td className="px-4 py-3">{order.user.name || order.user.email}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {sellerItems.map((item: any) => (
                            <p key={item.id} className="text-sm">{item.product.title} × {item.quantity}</p>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(order.total)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          order.status === "PAID" ? "border-emerald-200 bg-emerald-50 text-emerald-800" :
                          order.status === "PENDING" ? "border-amber-200 bg-amber-50 text-amber-800" :
                          "border-blue-200 bg-blue-50 text-blue-800"
                        } dark:border-white/10`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/seller/orders/${order.id}`} className="rounded-lg border border-black/15 px-3 py-1.5 text-[11px] hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Low Stock Alerts */}
      {(lowStockVariants > 0 || outOfStockVariants > 0) && (
        <section className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10 bg-amber-50 dark:bg-amber-900/20 border-amber-200/50 dark:border-amber-700/50">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 text-amber-600 dark:text-amber-400" />
            <h2 className="font-serif text-2xl text-amber-900 dark:text-amber-100">Inventory Alerts</h2>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {lowStockVariants > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-700/40 dark:bg-amber-900/30">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Low Stock</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">{lowStockVariants} variant{lowStockVariants !== 1 ? "s" : ""} have 5 or fewer items in stock.</p>
              </div>
            )}
            {outOfStockVariants > 0 && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-700/40 dark:bg-rose-900/30">
                <p className="text-sm font-medium text-rose-800 dark:text-rose-200">Out of Stock</p>
                <p className="text-xs text-rose-700 dark:text-rose-300">{outOfStockVariants} variant{outOfStockVariants !== 1 ? "s" : ""} are completely out of stock.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Rental Listings (Legacy) */}
      {listings.length > 0 && (
        <section className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl">Rental Listings</h2>
            <Link href="/list-item" className="text-sm underline opacity-75">Add listing</Link>
          </div>
          <div className="space-y-3 text-sm">
            {listings.map((listing: any) => (
              <article key={listing.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                <div className="flex flex-wrap items-start justify-between gap-1">
                  <div>
                    <p className="font-medium">{listing.brand} {listing.title}</p>
                    <p className="opacity-65">{listing.category} · Size {listing.size} · {listing.bookings.length} booking{listing.bookings.length !== 1 ? "s" : ""}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                    listing.featured
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                      : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300"
                  }`}>
                    {listing.featured ? "Live" : "Pending approval"}
                  </span>
                </div>
                <SellerListingActions itemId={listing.id} isAvailable={listing.isAvailable} />
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
