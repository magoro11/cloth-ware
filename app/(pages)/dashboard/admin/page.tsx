import { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/backend/lib/utils";
import { approveListingAction } from "@/backend/actions/admin-actions";
import { AdminUserActions } from "@/components/admin-user-actions";
import { TrendingUp, Users, Package, ShoppingBag, DollarSign, AlertTriangle, Settings } from "lucide-react";

const prismaAny = prisma as any;

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [
    pendingProducts,
    unpublishedProducts,
    users,
    vendors,
    disputes,
    revenue,
    recentOrders,
    productOrders,
    categories,
    totalStats,
  ] = await Promise.all([
    prismaAny.product.findMany({
      where: { isPublished: false },
      include: { vendor: { select: { businessName: true, email: true } }, variants: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prismaAny.product.findMany({
      where: { isPublished: false },
      include: { vendor: { select: { businessName: true, email: true } }, variants: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prismaAny.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prismaAny.user.findMany({
      where: { role: "LENDER" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prismaAny.returnRequest.findMany({
      where: { status: "REQUESTED" },
      include: { order: { select: { orderNumber: true } }, subOrder: { select: { subOrderNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prismaAny.payment.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCEEDED" },
    }),
    prismaAny.order.findMany({
      include: {
        user: { select: { email: true, name: true } },
        subOrders: {
          include: {
            items: { include: { product: { select: { title: true } } } },
            vendor: { select: { businessName: true } },
          },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prismaAny.order.findMany({
      include: {
        user: { select: { email: true, name: true } },
        subOrders: {
          include: {
            items: { include: { product: { select: { title: true } }, variant: { select: { sku: true } } } },
            vendor: { select: { businessName: true } },
          },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prismaAny.category.findMany({ orderBy: { name: "asc" } }),
    prismaAny.$transaction(async (tx: Prisma.TransactionClient) => [
      await tx.user.count(),
      await tx.user.count({ where: { role: "LENDER" } }),
      await tx.product.count({ where: { isPublished: true } }),
      await tx.product.count({ where: { isFeatured: true } }),
      await tx.order.count({ where: { status: { in: ["PAID", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] } } }),
    ]),
  ]);

  const [totalUsers, totalVendors, totalProducts, totalFeaturedItems, totalProductOrders] = totalStats;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-serif text-4xl">Admin Dashboard</h1>
      <p className="mt-2 text-sm opacity-70">Platform management, moderation, and analytics.</p>

      {/* Stats Overview */}
      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {[
          { label: "Total Users", value: totalUsers, icon: Users, color: "text-blue-500" },
          { label: "Vendors", value: totalVendors, icon: Settings, color: "text-purple-500" },
          { label: "Products", value: totalProducts, icon: ShoppingBag, color: "text-indigo-500" },
          { label: "Featured Items", value: totalFeaturedItems, icon: Package, color: "text-teal-500" },
          { label: "Product Orders", value: totalProductOrders, icon: TrendingUp, color: "text-emerald-500" },
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

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {/* Product Approval */}
        <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Products Pending Review</h2>
            <span className="text-xs opacity-65">{pendingProducts.length} product{pendingProducts.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {pendingProducts.length === 0 ? <p className="opacity-70">No products pending.</p> : null}
            {pendingProducts.map((product: any) => (
              <article key={product.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                <p className="font-medium">{product.brand?.name ?? product.title}</p>
                <p className="opacity-75">{product.vendor.businessName || product.vendor.email} · {product.variants.length} variants</p>
                <form action="/api/admin/products/approve">
                  <input type="hidden" name="productId" value={product.id} />
                  <button className="mt-2 rounded-lg bg-black px-3 py-1.5 text-xs text-white dark:bg-white dark:text-black">Approve</button>
                </form>
              </article>
            ))}
          </div>
        </div>

        {/* Returns & Refunds */}
        <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Return Requests</h2>
            <span className="text-xs opacity-65">{disputes.length} request{disputes.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {disputes.length === 0 ? <p className="opacity-70">No return requests.</p> : null}
            {disputes.map((req: any) => (
              <article key={req.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                <p className="font-medium">Order {req.order.orderNumber}</p>
                <p className="opacity-75">{req.subOrder?.subOrderNumber ?? "Full order"} · {req.reason}</p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {/* User Management */}
        <div className="lg:col-span-2 rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-serif text-2xl">User Management</h2>
          <div className="mt-3 space-y-2 text-sm">
            {users.length === 0 ? <p className="opacity-70">No users found.</p> : null}
            {users.map((user: any) => (
              <article key={user.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{user.name || user.email}</p>
                    <p className="text-xs opacity-75">{user.email} · {user.role} · Joined {new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                  <AdminUserActions userId={user.id} isBanned={Boolean(user.isBanned)} role={user.role} />
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Vendor Management */}
        <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-serif text-2xl">Vendors</h2>
          <div className="mt-3 space-y-2 text-sm">
            {vendors.length === 0 ? <p className="opacity-70">No vendors found.</p> : null}
            {vendors.map((vendor: any) => (
              <article key={vendor.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{vendor.businessName || vendor.email}</p>
                    <p className="text-xs opacity-75">{vendor.email} · Joined {new Date(vendor.createdAt).toLocaleDateString()}</p>
                  </div>
                  <AdminUserActions userId={vendor.id} isBanned={Boolean(vendor.isBanned)} role={vendor.role} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {/* Product Orders */}
        <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-serif text-2xl">Recent Orders</h2>
          <div className="mt-3 space-y-2 text-sm">
            {productOrders.length === 0 ? <p className="opacity-70">No orders yet.</p> : null}
            {productOrders.map((order: any) => {
              const allItems = order.subOrders.flatMap((so: any) => so.items);
              return (
                <article key={order.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                  <p className="font-medium">Order {order.orderNumber}</p>
                  <p className="opacity-75">{order.user.name || order.user.email} · {formatCurrency(order.total)} · {order.status}</p>
                  <p className="opacity-75 text-xs">
                    {allItems.map((item: any) => `${item.product.title} x${item.quantity}`).join(", ")}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {order.payments.map((payment: any) => (
                      <span key={payment.id} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                        payment.status === "SUCCEEDED" ? "border-emerald-200 bg-emerald-50 text-emerald-800" :
                        payment.status === "PENDING" ? "border-amber-200 bg-amber-50 text-amber-800" :
                        "border-rose-200 bg-rose-50 text-rose-800"
                      } dark:border-white/10`}>
                        {payment.provider}: {payment.status}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Categories & Platform Health */}
        <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-serif text-2xl">Categories</h2>
          <div className="mt-3 space-y-2 text-sm">
            {categories.length === 0 ? <p className="opacity-70">No categories.</p> : null}
            {categories.map((category: any) => (
              <article key={category.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10 flex items-center justify-between">
                <div>
                  <p className="font-medium">{category.name}</p>
                  <p className="text-xs opacity-75">{category.products?.length || 0} products</p>
                </div>
                <Link href="/admin/categories" className="text-xs underline opacity-70">Manage</Link>
              </article>
            ))}
          </div>
          <Link href="/admin/categories" className="mt-4 inline-block text-sm underline opacity-80">
            Manage all categories
          </Link>
        </div>
      </div>

      {/* Platform Revenue */}
      <div className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="font-serif text-2xl">Platform Revenue</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-black/5 p-3 dark:border-white/10">
            <p className="text-xs text-black/60 dark:text-white/60">Total Revenue</p>
            <p className="mt-1 text-lg font-bold text-black dark:text-white">{formatCurrency(revenue._sum.amount || 0)}</p>
          </div>
          <div className="rounded-lg border border-black/5 p-3 dark:border-white/10">
            <p className="text-xs text-black/60 dark:text-white/60">Active Vendors</p>
            <p className="mt-1 text-lg font-bold text-black dark:text-white">{totalVendors}</p>
          </div>
          <div className="rounded-lg border border-black/5 p-3 dark:border-white/10">
            <p className="text-xs text-black/60 dark:text-white/60">Pending Approvals</p>
            <p className="mt-1 text-lg font-bold text-black dark:text-white">{pendingProducts.length}</p>
          </div>
          <div className="rounded-lg border border-black/5 p-3 dark:border-white/10">
            <p className="text-xs text-black/60 dark:text-white/60">Return Requests</p>
            <p className="mt-1 text-lg font-bold text-black dark:text-white">{disputes.length}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
