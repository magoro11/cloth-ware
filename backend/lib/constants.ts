export const PLATFORM_COMMISSION_RATE = 0.1;
export const LATE_FEE_RATE_PER_DAY = 0.3;

export const CATEGORIES = [
  "Dresses",
  "Shirts & Blouses",
  "Trousers & Jeans",
  "Skirts & Shorts",
  "Jackets & Coats",
  "Suits & Blazers",
  "Traditional Wear",
  "Activewear",
  "Lingerie & Sleepwear",
  "Accessories",
  "Fabrics & Textiles",
] as const;

export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  Women: "Dresses",
  Men: "Shirts & Blouses",
  Shoes: "Accessories",
  Bags: "Accessories",
  Accessories: "Accessories",
};

export const FEATURED_BRANDS = [
  "Zara",
  "H&M",
  "Nike",
  "Adidas",
  "Levi's",
  "Tommy Hilfiger",
  "Calvin Klein",
  "Puma",
  "Uniqlo",
  "Mango",
] as const;

export const CONDITIONS = ["NEW", "EXCELLENT", "GOOD"] as const;
export const EVENT_TYPES = ["Wedding", "Graduation", "Party", "Corporate", "Date Night"] as const;
export const FABRICS = [
  "Cotton",
  "Linen",
  "Silk",
  "Wool",
  "Denim",
  "Polyester",
  "Viscose",
  "Chiffon",
  "Satin",
  "Tweed",
  "Leather",
  "Suede",
  "Kente",
  "Ankara",
] as const;
export const APP_NAME = "Cloth Marketplace";
export const APP_TAGLINE = "Discover, buy, and sell fashion.";
