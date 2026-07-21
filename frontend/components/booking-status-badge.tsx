import { cn } from "@/backend/lib/utils";

type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELED"
  | "LATE";

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; classes: string }
> = {
  PENDING: {
    label: "Pending",
    classes:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40",
  },
  CONFIRMED: {
    label: "Confirmed",
    classes:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/40",
  },
  ACTIVE: {
    label: "Active",
    classes:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40",
  },
  COMPLETED: {
    label: "Completed",
    classes:
      "bg-black/5 text-black/70 border-black/10 dark:bg-white/5 dark:text-white/60 dark:border-white/10",
  },
  CANCELED: {
    label: "Cancelled",
    classes:
      "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700/40",
  },
  LATE: {
    label: "Late",
    classes:
      "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700/40",
  },
};

export function BookingStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const config = STATUS_CONFIG[status as BookingStatus] ?? {
    label: status,
    classes:
      "bg-black/5 text-black/60 border-black/10 dark:bg-white/5 dark:text-white/50 dark:border-white/10",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        config.classes,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
