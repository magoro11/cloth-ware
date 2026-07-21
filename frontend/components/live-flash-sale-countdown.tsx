"use client";

import { FlashSaleCountdown } from "@/frontend/components/flash-sale-countdown";

type Props = {
  deadline: Date;
};

export function LiveFlashSaleCountdown({ deadline }: Props) {
  return <FlashSaleCountdown deadline={deadline} />;
}
