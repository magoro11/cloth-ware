import { getMyOrderDetail } from "@/backend/actions/order.actions";
import Link from "next/link";
import { formatCurrency } from "@/backend/lib/utils";

const STATUS_STAGES: string[] = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Order Placed",
  CONFIRMED: "Confirmed by Seller",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELED: "Canceled",
  REFUNDED: "Refunded",
};

export default async function OrderDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  let { order } = (await getMyOrderDetail({ orderId: id })) || { order: null };

  if (!order) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="rounded-2xl border border-black/10 bg-white p-8 text-center dark:border-white/10 dark:bg-[#151822]">
          <h1 className="text-2xl font-bold text-black dark:text-white">Order not found</h1>
          <Link href="/account/orders" className="mt-4 inline-block rounded-full bg-[#F68B1E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#e07d18]">
            Back to Orders
          </Link>
        </div>
      </main>
    );
  }

  const subOrders = order.subOrders ?? [];
  const statusLabel = STATUS_LABELS[order.status] ?? order.status;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <nav className="mb-6 text-sm text-black/60 dark:text-white/60">
        <Link href="/account/orders" className="hover:text-[#c25e30]">My Orders</Link>
        <span className="mx-1 opacity-50">/</span>
        <span className="text-black dark:text-white">{order.orderNumber}</span>
      </nav>

      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white">Order {order.orderNumber}</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium border-[#F68B1E]/10 text-[#F68B1E]`}>
          {statusLabel}
        </span>
      </div>

      {/* Order Summary */}
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-6">
          {/* Shipping */}
          <section className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#151822]">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-black/60 dark:text-white/60 mb-4">
              Shipping Address
            </h2>
            {order.shippingAddress ? (
              <div className="space-y-2 text-sm text-black/70 dark:text-white/70">
                <p className="font-medium">{(order.shippingAddress as any).name}</p>
                <p>{(order.shippingAddress as any).line1}</p>
                {(order.shippingAddress as any).line2 && <p>{(order.shippingAddress as any).line2}</p>}
                <p>
                  {(order.shippingAddress as any).city}, {(order.shippingAddress as any).county}
                  {(order.shippingAddress as any).town ? `, ${(order.shippingAddress as any).town}` : ""}
                </p>
                <p>{(order.shippingAddress as any).country}</p>
                <p>{(order.shippingAddress as any).phone}</p>
              </div>
            ) : (
              <p className="text-sm text-black/50 dark:text-white/50">No shipping address on file</p>
            )}
          </section>

          {/* Sub-orders with tracking */}
          <section className="space-y-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-black/60 dark:text-white/60 mb-4">
              Order Items ({subOrders.reduce((acc, so) => acc + so.items.length, 0)} items)
            </h2>
            {subOrders.map((so) => (
              <div key={so.id} className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-[#151822]">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-black dark:text-white">{so.vendor?.businessName ?? "Vendor"}</p>
                    <p className="text-xs text-black/40 dark:text-white/40">{so.subOrderNumber}</p>
                  </div>
                  <span className={`text-xs font-medium ${so.status === "DELIVERED" ? "text-[#059669]" : so.status === "CANCELED" ? "text-[#dc2626]" : "text-[#F68B1E]"}`}>
                    {STATUS_LABELS[so.status] ?? so.status}
                  </span>
                </div>

                <div className="space-y-3">
                  {so.items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-16 h-16 flex-shrink-0 rounded-lg border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5">
                        {((item.product as any).images?.[0]?.url) ? (
                          <img src={(item.product as any).images[0].url} alt="" className="object-cover w-full h-full rounded-lg" />
                        ) : (
                          <div className="grid h-full place-content-center text-[10px] opacity-60">No image</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-black dark:text-white line-clamp-1">
                          {item.productName}
                        </p>
                        {item.variantSku && (
                          <p className="text-xs text-black/50 dark:text-white/50">{item.variantSku}</p>
                        )}
                        <div className="mt-1 flex items-baseline gap-1">
                          <p className="text-sm font-semibold text-[#c25e30]">{formatCurrency(item.price)}</p>
                          <p className="text-sm text-black/50 dark:text-white/50">x {item.quantity}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-black/60 dark:text-white/60">Subtotal</span>
                    <span className="font-medium text-black dark:text-white">{formatCurrency(so.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-black/60 dark:text-white/60">Shipping</span>
                    <span className="font-medium text-black dark:text-white">{formatCurrency(so.shipping)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-black dark:text-white">Total</span>
                    <span className="text-[#c25e30]">{formatCurrency(so.total)}</span>
                  </div>
                </div>

                {/* Tracking timeline */}
                <div className="mt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-black/60 dark:text-white/60 mb-2">
                    Tracking
                  </h3>
                  <div className="relative pl-4">
                    <div className="absolute left-0 top-2 w-0.5 h-full bg-black/10 dark:bg-white/10" />
                    {STATUS_STAGES.map((stage, idx) => {
                      const stageIndex = STATUS_STAGES.indexOf(so.status);
                      const completed = stageIndex >= idx;
                      const current = stageIndex === idx;
                      return (
                        <div key={stage} className="flex items-center gap-3 mb-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                            completed
                              ? "border-[#059669] bg-[#059669]"
                              : current
                                ? "border-[#F68B1E] bg-white"
                                : "border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5"
                          }`}>
                            <span className={`text-[10px] font-bold ${completed || current ? "text-white" : "text-black/30"}`}>
                              {completed ? "✓" : current ? "!" : "○"}
                            </span>
                          </div>
                          <div>
                            <p className={`text-sm ${completed ? "font-medium text-black dark:text-white" : "text-black/50 dark:text-white/50"}`}>
                              {STATUS_LABELS[stage] ?? stage}
                            </p>
                            {completed && (
                              <p className="text-[10px] text-[#059669]">Completed</p>
                            )}
                            {current && (
                              <p className="text-[10px] text-[#F68B1E]">In progress</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div className="absolute left-3 top-[calc(100%+4px)] h-1 w-1 rounded-full border-2 border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5" />
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* Order totals sidebar */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#151822] sticky top-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-black/60 dark:text-white/60 mb-4">
              Order Summary
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-black/60 dark:text-white/60">Items Subtotal</span>
                <span className="font-medium text-black dark:text-white">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-black/60 dark:text-white/60">Shipping</span>
                <span className="font-medium text-black dark:text-white">{formatCurrency(order.shipping)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-black/60 dark:text-white/60">Tax</span>
                <span className="font-medium text-black dark:text-white">{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-black/5 pt-2 dark:border-white/10">
                <span className="text-sm font-medium text-black dark:text-white">Total</span>
                <span className="text-sm font-bold text-[#c25e30]">{formatCurrency(order.total)}</span>
              </div>
            </div>
            <div className="mt-5">
              <p className="text-[10px] text-black/50 dark:text-white/50 mb-2">
                Payment: {order.payments?.[0]?.provider ?? "—"}
              </p>
              <p className="text-[10px] text-black/50 dark:text-white/50">
                Status: {order.payments?.[0]?.status ?? "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
