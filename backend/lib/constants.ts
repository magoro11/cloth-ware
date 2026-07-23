export const PLATFORM_COMMISSION_RATE = 0.1;
export const LATE_FEE_RATE_PER_DAY = 0.3;

export const CATEGORIES = [
  "Electronics",
  "Fashion",
  "Phones & Tablets",
  "Home & Living",
  "Beauty & Health",
  "Supermarket",
  "Computing",
  "Gaming",
  "Sports & Outdoors",
  "Automotive",
] as const;

export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  Women: "Fashion",
  Men: "Fashion",
  Shoes: "Fashion",
  Bags: "Fashion",
  Accessories: "Fashion",
};

export const FEATURED_BRANDS = [
  "Samsung",
  "Apple",
  "Nike",
  "Adidas",
  "Zara",
  "H&M",
  "Gucci",
  "Prada",
  "LG",
  "Sony",
] as const;

export const CONDITIONS = ["NEW", "EXCELLENT", "GOOD"] as const;
export const EVENT_TYPES = ["Wedding", "Graduation", "Party", "Corporate", "Date Night"] as const;
export const APP_NAME = "ATELIER";
export const APP_TAGLINE = "Your African marketplace for everything.";
