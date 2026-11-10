import { getMyOrders } from "@/backend/actions/order.actions";
import Link from "next/link";
import { formatCurrency } from "@/backend/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELED: "Canceled",
  REFUNDED: "Refunded",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-[#F68B1E] border-[#F68B1E]/10",
  PAID: "text-[#059669] border-[#059669]/10",
  CONFIRMED: "text-[#059669] border-[#059669]/10",
  PROCESSING: "text-[#2563eb] border-[#2563eb]/10",
  SHIPPED: "text-[#2563eb] border-[#2563eb]/10",
  OUT_FOR_DELIVERY: "text-[#2563eb] border-[#2563eb]/10",
  DELIVERED: "text-[#059669] border-[#059669]/10",
  CANCELED: "text-[#dc2626] border-[#dc2626]/10",
  REFUNDED: "text-[#dc2626] border-[#dc2626]/10",
};

export default async function OrdersPage() {
  let { orders } = (await getMyOrders()) || { orders: [] };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white">My Orders</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Track your orders and manage returns
          </p>
        </div>
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-black hover:bg-black/5 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10">
          Continue Shopping
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 p-12 text-center dark:border-white/20">
          <p className="text-black/60 dark:text-white/60">No orders yet</p>
          <Link href="/marketplace" className="mt-4 inline-block rounded-full bg-[#F68B1E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#e07d18]">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const subOrders = order.subOrders ?? [];
            const allDelivered = subOrders.every((so) => so.status === "DELIVERED");
            const anyCanceled = subOrders.some((so) => so.status === "CANCELED");
            const canCancel = order.status === "PENDING" || order.status === "PAID";
            const statusLabel = STATUS_LABELS[order.status] ?? order.status;
            const statusColor = STATUS_COLORS[order.status] ?? "text-black/60";

            return (
              <div key={order.id} className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#151822]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-sm font-medium text-black dark:text-white">{order.orderNumber}</p>
                    <p className="text-xs text-black/50 dark:text-white/50">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold text-black/60 dark:text-white/60 uppercase">Subtotal</p>
                    <p className="text-sm font-medium text-black dark:text-white">{formatCurrency(order.subtotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-black/60 dark:text-white/60 uppercase">Shipping</p>
                    <p className="text-sm font-medium text-black dark:text-white">{formatCurrency(order.shipping)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-black/60 dark:text-white/60 uppercase">Total</p>
                    <p className="text-sm font-bold text-[#c25e30]">{formatCurrency(order.total)}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <p className="text-xs font-semibold text-black/60 dark:text-white/60 uppercase">Items</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {subOrders.flatMap((so) =>
                      so.items.map((item) => (
                        <div key={item.id} className="flex gap-3">
                          <div className="w-16 h-16 flex-shrink-0 rounded-lg border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5">
                            {item.product.images?.[0]?.url ? (
                              <img src={item.product.images[0].url} alt="" className="object-cover w-full h-full rounded-lg" />
                            ) : (
                              <div className="grid h-full place-content-center text-[10px] opacity-60">No image</div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-black dark:text-white line-clamp-1">
                              {item.productName}
                            </p>
                            <p className="text-xs text-black/50 dark:text-white/50">
                              Qty {item.quantity} &bull; {formatCurrency(item.price)}
                            </p>
                            <p className="text-xs text-black/60 dark:text-white/60 mt-1">
                              {so.vendor?.businessName ?? "Vendor"}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/10">
                  <div className="flex flex-wrap gap-3 mb-3">
                    {subOrders.map((so) => (
                      <span key={so.id} className="text-xs text-black/50 dark:text-white/50">
                        {so.vendor?.businessName ?? "Vendor"}: {STATUS_LABELS[so.status] ?? so.status}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {canCancel && !anyCanceled && !allDelivered ? (
                      <button
                        className="text-xs font-medium text-[#dc2626] hover:underline"
                        onClick={() => {
                          if (confirm("Cancel this order?")) {
                            // Cancel handled via server action
                          }
                        }}
                      >
                        Cancel Order
                      </button>
                    ) : null}
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="text-xs font-medium text-[#F68B1E] hover:underline"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
