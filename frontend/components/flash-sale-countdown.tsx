"use client";

import { useEffect, useState } from "react";

export function FlashSaleCountdown({ deadline }: { deadline: Date }) {
  const [remaining, setRemaining] = useState(() => deadline.getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setRemaining(deadline.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (remaining <= 0) return null;

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (value: number) => String(value).padStart(2, "0");
  const label = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/90 px-4 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/10">
      <span className="text-black/60 dark:text-white/60">Time Left:</span>
      <span className="tabular-nums text-[#c25e30]">{label}</span>
    </div>
  );
}
