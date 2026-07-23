"use client";

import { useState, useEffect, useRef } from "react";
import { FlashSaleCountdown } from "@/frontend/components/flash-sale-countdown";

export function ClientFlashSaleCountdown() {
  const [deadline, setDeadline] = useState<Date | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    fetch("/api/settings/flash-sale")
      .then((res) => res.json())
      .then((data) => {
        if (mountedRef.current) {
          setDeadline(data.deadline ? new Date(data.deadline) : new Date(Date.now() + 10 * 60 * 60 * 1000));
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setDeadline(new Date(Date.now() + 10 * 60 * 60 * 1000));
        }
      });
  }, []);

  if (!deadline) return null;

  return <FlashSaleCountdown deadline={deadline} />;
}
