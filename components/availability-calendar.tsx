import { addDays, eachDayOfInterval, format, isSameDay } from "date-fns";

type Range = {
  startDate: Date;
  endDate: Date;
};

export function AvailabilityCalendar({ blockedRanges }: { blockedRanges: Range[] }) {
  const start = new Date();
  const end = addDays(start, 34);
  const days = eachDayOfInterval({ start, end });

  function isBlocked(day: Date) {
    return blockedRanges.some((range) => day >= range.startDate && day <= range.endDate);
  }

  return (
    <section className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Availability calendar</h2>
          <p className="mt-1 text-sm opacity-75">Next 35 days of rental availability for this piece.</p>
        </div>
        <div className="flex items-center gap-3 text-xs opacity-75">
          <span className="inline-flex items-center gap-2">
            <span className="size-3 rounded-full bg-emerald-500" />
            Available
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-3 rounded-full bg-rose-500" />
            Booked
          </span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs">
        {days.map((day) => {
          const blocked = isBlocked(day);
          const today = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              className={`rounded-xl border px-2 py-3 ${
                blocked
                  ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
              } ${today ? "ring-2 ring-black/20 dark:ring-white/20" : ""}`}
            >
              <p className="font-medium uppercase tracking-wide">{format(day, "EEE")}</p>
              <p className="mt-1 text-base">{format(day, "d")}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
