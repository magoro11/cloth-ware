"use client";

import { useState } from "react";
import { FlashSaleCountdown } from "@/frontend/components/flash-sale-countdown";

export function ClientFlashSaleCountdown() {
  const [deadline] = useState(() => new Date(Date.now() + 10 * 60 * 60 * 1000));

  return <FlashSaleCountdown deadline={deadline} />;
}
