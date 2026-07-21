import { differenceInCalendarDays, isAfter, isBefore } from "date-fns";
import { LATE_FEE_RATE_PER_DAY, PLATFORM_COMMISSION_RATE } from "@/lib/constants";

export type QuoteInput = {
  rentalPricePerDay: number;
  securityDeposit: number;
  startDate: Date;
  endDate: Date;
};

export type QuoteResult = {
  days: number;
  rentalAmount: number;
  securityDeposit: number;
  commissionAmount: number;
  ownerPayoutAmount: number;
  totalCharge: number;
  lateFeePerDay: number;
};

export function calculateRentalDays(startDate: Date, endDate: Date): number {
  if (isAfter(startDate, endDate)) {
    throw new Error("Start date must be before end date");
  }
  return differenceInCalendarDays(endDate, startDate) + 1;
}

export function calculateRentalQuote(input: QuoteInput): QuoteResult {
  const days = calculateRentalDays(input.startDate, input.endDate);
  const rentalAmount = days * input.rentalPricePerDay;
  const commissionAmount = Math.round(rentalAmount * PLATFORM_COMMISSION_RATE);
  const ownerPayoutAmount = rentalAmount - commissionAmount;
  const lateFeePerDay = Math.round(input.rentalPricePerDay * LATE_FEE_RATE_PER_DAY);
  return {
    days,
    rentalAmount,
    securityDeposit: input.securityDeposit,
    commissionAmount,
    ownerPayoutAmount,
    totalCharge: rentalAmount + input.securityDeposit,
    lateFeePerDay,
  };
}

export type DateRange = {
  startDate: Date;
  endDate: Date;
};

export function overlaps(rangeA: DateRange, rangeB: DateRange): boolean {
  return (
    isBefore(rangeA.startDate, new Date(rangeB.endDate.getTime() + 86400000)) &&
    isBefore(rangeB.startDate, new Date(rangeA.endDate.getTime() + 86400000))
  );
}
