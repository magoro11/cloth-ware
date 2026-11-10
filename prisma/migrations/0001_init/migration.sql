-- 0001_init
-- Initial marketplace schema for [YourMarket]
-- Run with: prisma migrate deploy

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Custom enums
CREATE TYPE public."UserRole" AS ENUM ('CUSTOMER', 'LENDER', 'ADMIN');
CREATE TYPE public."Condition" AS ENUM ('NEW', 'REFURBISHED', 'USED');
CREATE TYPE public."OrderStatus" AS ENUM ('PENDING', 'PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELED', 'REFUNDED');
CREATE TYPE public."SubOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELED', 'REFUNDED');
CREATE TYPE public."PaymentMethod" AS ENUM ('CARD', 'MPESA', 'COD');
CREATE TYPE public."PaymentProvider" AS ENUM ('STRIPE', 'PAYSTACK', 'FLUTTERWAVE', 'MPESA_DARAJA', 'PAY_ON_DELIVERY');
CREATE TYPE public."PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'CANCELED');
CREATE TYPE public."CouponType" AS ENUM ('PERCENT', 'FIXED');
CREATE TYPE public."FlashSaleStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'ENDED');
CREATE TYPE public."ReturnStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'RECEIVED', 'COMPLETED');
CREATE TYPE public."RefundStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED');
CREATE TYPE public."PayoutStatus" AS ENUM ('PENDING', 'RELEASED', 'FAILED');
CREATE TYPE public."BannerPosition" AS ENUM ('HERO', 'CATEGORY', 'FLASH_SALE', 'PROMO');
CREATE TYPE public."NotificationType" AS ENUM ('ORDER', 'PAYMENT', 'SHIPPING', 'PROMO', 'SYSTEM');

-- Users
CREATE TABLE public."User" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name            TEXT,
  email           TEXT UNIQUE NOT NULL,
  emailLower      TEXT UNIQUE NOT NULL,
  phone           TEXT,
  passwordHash    TEXT,
  role            public."UserRole" NOT NULL DEFAULT 'CUSTOMER',
  isBanned        BOOLEAN NOT NULL DEFAULT FALSE,
  emailVerified   TIMESTAMPTZ,
  image           TEXT,
  "stripeCustomerId" TEXT,
  "stripeConnectedId" TEXT,
  createdAt       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "User.emailLower_idx" ON public."User" (emailLower);
CREATE INDEX "User.role_idx" ON public."User" (role);
CREATE INDEX "User.isBanned_idx" ON public."User" (isBanned);

-- Vendor profiles
CREATE TABLE public."VendorProfile" (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  userId              TEXT UNIQUE NOT NULL,
  businessName        TEXT NOT NULL,
  businessEmail       TEXT,
  businessPhone       TEXT,
  businessAddress     TEXT,
  county              TEXT,
  town                TEXT,
  taxId               TEXT,
  verificationStatus  TEXT NOT NULL DEFAULT 'pending',
  commissionRate      INTEGER NOT NULL DEFAULT 1000,
  payoutBalance       INTEGER NOT NULL DEFAULT 0,
  totalSales          INTEGER NOT NULL DEFAULT 0,
  totalOrders         INTEGER NOT NULL DEFAULT 0,
  rating              DECIMAL DEFAULT 0,
  totalReviews        INTEGER NOT NULL DEFAULT 0,
  isActive            BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "VendorProfile.userId_fkey" FOREIGN KEY (userId) REFERENCES public."User"(id) ON DELETE CASCADE
);

CREATE INDEX "VendorProfile.userId_idx" ON public."VendorProfile" (userId);
CREATE INDEX "VendorProfile.verificationStatus_idx" ON public."VendorProfile" (verificationStatus);
CREATE INDEX "VendorProfile.isActive_idx" ON public."VendorProfile" (isActive);

-- Categories
CREATE TABLE public."Category" (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name          TEXT UNIQUE NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  description   TEXT,
  imageUrl      TEXT,
  parentId      TEXT,
  isActive      BOOLEAN NOT NULL DEFAULT TRUE,
  sortOrder     INTEGER NOT NULL DEFAULT 0,
  createdAt     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Category.parentId_fkey" FOREIGN KEY (parentId) REFERENCES public."Category"(id)
);

CREATE INDEX "Category.slug_idx" ON public."Category" (slug);
CREATE INDEX "Category.parentId_idx" ON public."Category" (parentId);
CREATE INDEX "Category.isActive_idx" ON public."Category" (isActive);

-- Brands
CREATE TABLE public."Brand" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT UNIQUE NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  logoUrl     TEXT,
  isActive    BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "Brand.slug_idx" ON public."Brand" (slug);
CREATE INDEX "Brand.isActive_idx" ON public."Brand" (isActive);

-- Products
CREATE TABLE public."Product" (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vendorId          TEXT NOT NULL,
  categoryId        TEXT,
  brandId           TEXT,
  slug              TEXT UNIQUE NOT NULL,
  title             TEXT NOT NULL,
  "shortDescription" TEXT,
  description       TEXT NOT NULL,
  "basePrice"       INTEGER NOT NULL,
  condition         public."Condition" NOT NULL DEFAULT 'NEW',
  "stockAlert"      INTEGER NOT NULL DEFAULT 5,
  isPublished       BOOLEAN NOT NULL DEFAULT TRUE,
  isFeatured        BOOLEAN NOT NULL DEFAULT FALSE,
  isOfficial        BOOLEAN NOT NULL DEFAULT FALSE,
  "weightG"         INTEGER,
  "dimensionsCm"    TEXT,
  createdAt         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Product.vendorId_fkey" FOREIGN KEY (vendorId) REFERENCES public."VendorProfile"(id) ON DELETE CASCADE,
  CONSTRAINT "Product.categoryId_fkey" FOREIGN KEY (categoryId) REFERENCES public."Category"(id),
  CONSTRAINT "Product.brandId_fkey" FOREIGN KEY (brandId) REFERENCES public."Brand"(id)
);

CREATE INDEX "Product.vendorId_idx" ON public."Product" (vendorId);
CREATE INDEX "Product.categoryId_idx" ON public."Product" (categoryId);
CREATE INDEX "Product.brandId_idx" ON public."Product" (brandId);
CREATE INDEX "Product.slug_idx" ON public."Product" (slug);
CREATE INDEX "Product.isPublished_idx" ON public."Product" (isPublished);
CREATE INDEX "Product.isFeatured_idx" ON public."Product" (isFeatured);
CREATE INDEX "Product.condition_idx" ON public."Product" (condition);
CREATE INDEX "Product.createdAt_idx" ON public."Product" (createdAt);

-- Full-text search vector on products
ALTER TABLE public."Product" ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce("shortDescription", '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'C')
) STORED;

CREATE INDEX "Product.searchVector_idx" ON public."Product" USING GIN ("searchVector");
-- Product variants
CREATE TABLE public."ProductVariant" (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  productId TEXT NOT NULL,
  sku       TEXT UNIQUE NOT NULL,
  size      TEXT,
  color     TEXT,
  storage   TEXT,
  price     INTEGER, -- null => product.basePrice
  stock     INTEGER NOT NULL DEFAULT 0,
  weightG   INTEGER,
  isActive  BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ProductVariant.productId_fkey" FOREIGN KEY (productId) REFERENCES public."Product"(id) ON DELETE CASCADE
);

CREATE INDEX "ProductVariant.productId_idx" ON public."ProductVariant" (productId);
CREATE INDEX "ProductVariant.sku_idx" ON public."ProductVariant" (sku);
CREATE INDEX "ProductVariant.size_color_storage_idx" ON public."ProductVariant" (size, color, storage);
CREATE INDEX "ProductVariant.isActive_idx" ON public."ProductVariant" (isActive);
CREATE INDEX "ProductVariant.stock_idx" ON public."ProductVariant" (stock);

-- Product images
CREATE TABLE public."ProductImage" (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  productId TEXT NOT NULL,
  url       TEXT NOT NULL,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  isPrimary BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ProductImage.productId_fkey" FOREIGN KEY (productId) REFERENCES public."Product"(id) ON DELETE CASCADE
);

CREATE INDEX "ProductImage.productId_idx" ON public."ProductImage" (productId);
CREATE INDEX "ProductImage.isPrimary_idx" ON public."ProductImage" (isPrimary);

-- Carts
CREATE TABLE public."Cart" (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  userId    TEXT,
  sessionId TEXT,
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Cart.userId_fkey" FOREIGN KEY (userId) REFERENCES public."User"(id) ON DELETE CASCADE,
  CONSTRAINT "Cart.userId_sessionId_key" UNIQUE (userId, sessionId)
);

CREATE INDEX "Cart.userId_idx" ON public."Cart" (userId);
CREATE INDEX "Cart.sessionId_idx" ON public."Cart" (sessionId);

-- Cart items
CREATE TABLE public."CartItem" (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cartId    TEXT NOT NULL,
  productId TEXT NOT NULL,
  variantId TEXT,
  quantity  INTEGER NOT NULL DEFAULT 1,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "CartItem.cartId_fkey" FOREIGN KEY (cartId) REFERENCES public."Cart"(id) ON DELETE CASCADE,
  CONSTRAINT "CartItem.productId_fkey" FOREIGN KEY (productId) REFERENCES public."Product"(id) ON DELETE CASCADE,
  CONSTRAINT "CartItem.variantId_fkey" FOREIGN KEY (variantId) REFERENCES public."ProductVariant"(id),
  CONSTRAINT "CartItem.cartId_productId_variantId_key" UNIQUE (cartId, productId, variantId)
);

CREATE INDEX "CartItem.cartId_idx" ON public."CartItem" (cartId);
CREATE INDEX "CartItem.productId_idx" ON public."CartItem" (productId);

-- Orders (parent)
CREATE TABLE public."Order" (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  userId           TEXT NOT NULL,
  orderNumber      TEXT UNIQUE NOT NULL,
  status           public."OrderStatus" NOT NULL DEFAULT 'PENDING',
  subtotal         INTEGER NOT NULL,
  shipping         INTEGER NOT NULL DEFAULT 0,
  tax              INTEGER NOT NULL DEFAULT 0,
  total            INTEGER NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'KES',
  "shippingAddress" JSONB,
  "pickupStationId" TEXT,
  notes            TEXT,
  createdAt        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Order.userId_fkey" FOREIGN KEY (userId) REFERENCES public."User"(id),
  CONSTRAINT "Order.pickupStationId_fkey" FOREIGN KEY ("pickupStationId") REFERENCES public."PickupStation"(id)
);

CREATE INDEX "Order.userId_idx" ON public."Order" (userId);
CREATE INDEX "Order.orderNumber_idx" ON public."Order" (orderNumber);
CREATE INDEX "Order.status_idx" ON public."Order" (status);
CREATE INDEX "Order.createdAt_idx" ON public."Order" (createdAt);

-- Sub-orders (per vendor)
CREATE TABLE public."SubOrder" (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  orderId           TEXT NOT NULL,
  vendorId          TEXT NOT NULL,
  subOrderNumber    TEXT UNIQUE NOT NULL,
  status            public."SubOrderStatus" NOT NULL DEFAULT 'PENDING',
  subtotal          INTEGER NOT NULL,
  shipping          INTEGER NOT NULL DEFAULT 0,
  "commissionAmount" INTEGER NOT NULL DEFAULT 0,
  total             INTEGER NOT NULL,
  trackingNumber    TEXT,
  shippedAt         TIMESTAMPTZ,
  deliveredAt       TIMESTAMPTZ,
  createdAt         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "SubOrder.orderId_fkey" FOREIGN KEY (orderId) REFERENCES public."Order"(id) ON DELETE CASCADE,
  CONSTRAINT "SubOrder.vendorId_fkey" FOREIGN KEY (vendorId) REFERENCES public."VendorProfile"(id)
);

CREATE INDEX "SubOrder.orderId_idx" ON public."SubOrder" (orderId);
CREATE INDEX "SubOrder.vendorId_idx" ON public."SubOrder" (vendorId);
CREATE INDEX "SubOrder.subOrderNumber_idx" ON public."SubOrder" (subOrderNumber);
CREATE INDEX "SubOrder.status_idx" ON public."SubOrder" (status);

-- Order items
CREATE TABLE public."OrderItem" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  subOrderId  TEXT NOT NULL,
  productId   TEXT NOT NULL,
  variantId   TEXT,
  productName TEXT NOT NULL,
  variantSku  TEXT,
  quantity    INTEGER NOT NULL,
  price       INTEGER NOT NULL,
  createdAt   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "OrderItem.subOrderId_fkey" FOREIGN KEY (subOrderId) REFERENCES public."SubOrder"(id) ON DELETE CASCADE,
  CONSTRAINT "OrderItem.productId_fkey" FOREIGN KEY (productId) REFERENCES public."Product"(id),
  CONSTRAINT "OrderItem.variantId_fkey" FOREIGN KEY (variantId) REFERENCES public."ProductVariant"(id)
);

CREATE INDEX "OrderItem.subOrderId_idx" ON public."OrderItem" (subOrderId);
CREATE INDEX "OrderItem.productId_idx" ON public."OrderItem" (productId);

-- Payments
CREATE TABLE public."Payment" (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  orderId           TEXT NOT NULL,
  subOrderId        TEXT,
  provider          public."PaymentProvider" NOT NULL,
  "providerPaymentId" TEXT UNIQUE NOT NULL,
  status            public."PaymentStatus" NOT NULL DEFAULT 'PENDING',
  amount            INTEGER NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'KES',
  paidAt            TIMESTAMPTZ,
  rawResponse       JSONB,
  "userId"          TEXT NOT NULL,
  createdAt         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Payment.orderId_fkey" FOREIGN KEY (orderId) REFERENCES public."Order"(id) ON DELETE CASCADE,
  CONSTRAINT "Payment.subOrderId_fkey" FOREIGN KEY (subOrderId) REFERENCES public."SubOrder"(id),
  CONSTRAINT "Payment.userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id)
);

CREATE INDEX "Payment.orderId_idx" ON public."Payment" (orderId);
CREATE INDEX "Payment.subOrderId_idx" ON public."Payment" (subOrderId);
CREATE INDEX "Payment.providerPaymentId_idx" ON public."Payment" ("providerPaymentId");
CREATE INDEX "Payment.status_idx" ON public."Payment" (status);
CREATE INDEX "Payment.userId_idx" ON public."Payment" ("userId");

-- Refunds
CREATE TABLE public."Refund" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  orderId     TEXT NOT NULL,
  subOrderId  TEXT,
  paymentId   TEXT,
  amount      INTEGER NOT NULL,
  status      public."RefundStatus" NOT NULL DEFAULT 'REQUESTED',
  reason      TEXT,
  processedAt TIMESTAMPTZ,
  createdAt   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Refund.orderId_fkey" FOREIGN KEY (orderId) REFERENCES public."Order"(id) ON DELETE CASCADE,
  CONSTRAINT "Refund.subOrderId_fkey" FOREIGN KEY (subOrderId) REFERENCES public."SubOrder"(id),
  CONSTRAINT "Refund.paymentId_fkey" FOREIGN KEY (paymentId) REFERENCES public."Payment"(id)
);

CREATE INDEX "Refund.orderId_idx" ON public."Refund" (orderId);
CREATE INDEX "Refund.subOrderId_idx" ON public."Refund" (subOrderId);
CREATE INDEX "Refund.status_idx" ON public."Refund" (status);

-- Return requests
CREATE TABLE public."ReturnRequest" (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  orderId              TEXT NOT NULL,
  subOrderId           TEXT,
  userId               TEXT NOT NULL,
  status               public."ReturnStatus" NOT NULL DEFAULT 'REQUESTED',
  reason               TEXT NOT NULL,
  note                 TEXT,
  "pickupScheduledAt"  TIMESTAMPTZ,
  receivedAt           TIMESTAMPTZ,
  completedAt          TIMESTAMPTZ,
  createdAt            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ReturnRequest.orderId_fkey" FOREIGN KEY (orderId) REFERENCES public."Order"(id) ON DELETE CASCADE,
  CONSTRAINT "ReturnRequest.subOrderId_fkey" FOREIGN KEY (subOrderId) REFERENCES public."SubOrder"(id),
  CONSTRAINT "ReturnRequest.userId_fkey" FOREIGN KEY (userId) REFERENCES public."User"(id) ON DELETE CASCADE
);

CREATE INDEX "ReturnRequest.orderId_idx" ON public."ReturnRequest" (orderId);
CREATE INDEX "ReturnRequest.subOrderId_idx" ON public."ReturnRequest" (subOrderId);
CREATE INDEX "ReturnRequest.userId_idx" ON public."ReturnRequest" (userId);
CREATE INDEX "ReturnRequest.status_idx" ON public."ReturnRequest" (status);

-- Addresses
CREATE TABLE public."Address" (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  userId     TEXT NOT NULL,
  label      TEXT NOT NULL DEFAULT 'home',
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  line1      TEXT NOT NULL,
  line2      TEXT,
  city       TEXT NOT NULL,
  county     TEXT NOT NULL,
  town       TEXT,
  postalCode TEXT,
  country    TEXT NOT NULL DEFAULT 'KE',
  isDefault  BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Address.userId_fkey" FOREIGN KEY (userId) REFERENCES public."User"(id) ON DELETE CASCADE
);

CREATE INDEX "Address.userId_idx" ON public."Address" (userId);
CREATE INDEX "Address.isDefault_idx" ON public."Address" (isDefault);
CREATE INDEX "Address.county_idx" ON public."Address" (county);

-- Pickup stations
CREATE TABLE public."PickupStation" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  code        TEXT UNIQUE NOT NULL,
  address     TEXT NOT NULL,
  county      TEXT NOT NULL,
  town        TEXT NOT NULL,
  phone       TEXT,
  isActive    BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "PickupStation.code_idx" ON public."PickupStation" (code);
CREATE INDEX "PickupStation.county_idx" ON public."PickupStation" (county);
CREATE INDEX "PickupStation.isActive_idx" ON public."PickupStation" (isActive);

-- Shipping zones
CREATE TABLE public."ShippingZone" (
  id                        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name              TEXT UNIQUE NOT NULL,
  counties          TEXT[] NOT NULL DEFAULT '{}',
  deliveryFee       INTEGER NOT NULL,
  "freeDeliveryThreshold" INTEGER NOT NULL,
  "estimatedDaysMin"  INTEGER NOT NULL,
  "estimatedDaysMax"  INTEGER NOT NULL,
  isActive          BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "ShippingZone.name_idx" ON public."ShippingZone" (name);
CREATE INDEX "ShippingZone.isActive_idx" ON public."ShippingZone" (isActive);

-- Coupons
CREATE TABLE public."Coupon" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code            TEXT UNIQUE NOT NULL,
  type            public."CouponType" NOT NULL,
  value           INTEGER NOT NULL,
  minOrder        INTEGER,
  maxDiscount     INTEGER,
  usageLimit      INTEGER,
  usedCount       INTEGER NOT NULL DEFAULT 0,
  perUserLimit    INTEGER NOT NULL DEFAULT 1,
  validFrom       TIMESTAMPTZ NOT NULL,
  validTo         TIMESTAMPTZ NOT NULL,
  isActive        BOOLEAN NOT NULL DEFAULT TRUE,
  "appliesToVendors" TEXT[] NOT NULL DEFAULT '{}',
  createdAt       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "Coupon.code_idx" ON public."Coupon" (code);
CREATE INDEX "Coupon.isActive_idx" ON public."Coupon" (isActive);
CREATE INDEX "Coupon.validFrom_validTo_idx" ON public."Coupon" (validFrom, validTo);

-- Flash sales
CREATE TABLE public."FlashSale" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title        TEXT NOT NULL,
  description  TEXT,
  startDate    TIMESTAMPTZ NOT NULL,
  endDate      TIMESTAMPTZ NOT NULL,
  status       public."FlashSaleStatus" NOT NULL DEFAULT 'INACTIVE',
  "discountPercent" INTEGER NOT NULL,
  isFeatured   BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "FlashSale.startDate_endDate_idx" ON public."FlashSale" (startDate, endDate);
CREATE INDEX "FlashSale.status_idx" ON public."FlashSale" (status);
CREATE INDEX "FlashSale.isFeatured_idx" ON public."FlashSale" (isFeatured);

-- Flash sale items
CREATE TABLE public."FlashSaleItem" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  flashSaleId TEXT NOT NULL,
  productId   TEXT NOT NULL,
  variantId   TEXT,
  salePrice   INTEGER NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0,
  soldCount   INTEGER NOT NULL DEFAULT 0,
  isActive    BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT "FlashSaleItem.flashSaleId_fkey" FOREIGN KEY (flashSaleId) REFERENCES public."FlashSale"(id) ON DELETE CASCADE,
  CONSTRAINT "FlashSaleItem.productId_fkey" FOREIGN KEY (productId) REFERENCES public."Product"(id) ON DELETE CASCADE,
  CONSTRAINT "FlashSaleItem.variantId_fkey" FOREIGN KEY (variantId) REFERENCES public."ProductVariant"(id)
);

CREATE INDEX "FlashSaleItem.flashSaleId_idx" ON public."FlashSaleItem" (flashSaleId);
CREATE INDEX "FlashSaleItem.productId_idx" ON public."FlashSaleItem" (productId);
CREATE INDEX "FlashSaleItem.isActive_idx" ON public."FlashSaleItem" (isActive);

-- Reviews
CREATE TABLE public."Review" (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  productId         TEXT NOT NULL,
  userId            TEXT NOT NULL,
  orderItemId       TEXT,
  rating            INTEGER NOT NULL,
  title             TEXT,
  comment           TEXT,
  photos            TEXT[] NOT NULL DEFAULT '{}',
  "isVerifiedPurchase" BOOLEAN NOT NULL DEFAULT FALSE,
  isApproved        BOOLEAN NOT NULL DEFAULT FALSE,
  helpfulCount      INTEGER NOT NULL DEFAULT 0,
  createdAt         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Review.productId_fkey" FOREIGN KEY (productId) REFERENCES public."Product"(id) ON DELETE CASCADE,
  CONSTRAINT "Review.userId_fkey" FOREIGN KEY (userId) REFERENCES public."User"(id) ON DELETE CASCADE,
  CONSTRAINT "Review.orderItemId_fkey" FOREIGN KEY (orderItemId) REFERENCES public."OrderItem"(id),
  CONSTRAINT "Review.orderItemId_key" UNIQUE (orderItemId)
);

CREATE INDEX "Review.productId_idx" ON public."Review" (productId);
CREATE INDEX "Review.userId_idx" ON public."Review" (userId);
CREATE INDEX "Review.isVerifiedPurchase_idx" ON public."Review" ("isVerifiedPurchase");
CREATE INDEX "Review.isApproved_idx" ON public."Review" (isApproved);
CREATE INDEX "Review.rating_idx" ON public."Review" (rating);

-- Wishlist items
CREATE TABLE public."WishlistItem" (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  userId    TEXT NOT NULL,
  productId TEXT NOT NULL,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "WishlistItem.userId_fkey" FOREIGN KEY (userId) REFERENCES public."User"(id) ON DELETE CASCADE,
  CONSTRAINT "WishlistItem.productId_fkey" FOREIGN KEY (productId) REFERENCES public."Product"(id) ON DELETE CASCADE,
  CONSTRAINT "WishlistItem.userId_productId_key" UNIQUE (userId, productId)
);

CREATE INDEX "WishlistItem.userId_idx" ON public."WishlistItem" (userId);
CREATE INDEX "WishlistItem.productId_idx" ON public."WishlistItem" (productId);

-- Payouts
CREATE TABLE public."Payout" (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vendorId           TEXT NOT NULL,
  subOrderId         TEXT,
  amount             INTEGER NOT NULL,
  "commissionDeducted" INTEGER NOT NULL DEFAULT 0,
  netAmount          INTEGER NOT NULL,
  status             public."PayoutStatus" NOT NULL DEFAULT 'PENDING',
  reference          TEXT,
  paidAt             TIMESTAMPTZ,
  createdAt          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Payout.vendorId_fkey" FOREIGN KEY (vendorId) REFERENCES public."VendorProfile"(id),
  CONSTRAINT "Payout.subOrderId_fkey" FOREIGN KEY (subOrderId) REFERENCES public."SubOrder"(id)
);

CREATE INDEX "Payout.vendorId_idx" ON public."Payout" (vendorId);
CREATE INDEX "Payout.subOrderId_idx" ON public."Payout" (subOrderId);
CREATE INDEX "Payout.status_idx" ON public."Payout" (status);

-- Banners
CREATE TABLE public."Banner" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title       TEXT NOT NULL,
  subtitle    TEXT,
  imageUrl    TEXT NOT NULL,
  linkUrl     TEXT,
  position    public."BannerPosition" NOT NULL DEFAULT 'HERO',
  categoryId  TEXT,
  startDate   TIMESTAMPTZ,
  endDate     TIMESTAMPTZ,
  isActive    BOOLEAN NOT NULL DEFAULT TRUE,
  sortOrder   INTEGER NOT NULL DEFAULT 0,
  createdAt   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Banner.categoryId_fkey" FOREIGN KEY (categoryId) REFERENCES public."Category"(id)
);

CREATE INDEX "Banner.position_idx" ON public."Banner" (position);
CREATE INDEX "Banner.isActive_idx" ON public."Banner" (isActive);
CREATE INDEX "Banner.categoryId_idx" ON public."Banner" (categoryId);

-- Notifications
CREATE TABLE public."Notification" (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  userId    TEXT NOT NULL,
  title     TEXT NOT NULL,
  body      TEXT,
  type      public."NotificationType" NOT NULL,
  isRead    BOOLEAN NOT NULL DEFAULT FALSE,
  link      TEXT,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Notification.userId_fkey" FOREIGN KEY (userId) REFERENCES public."User"(id) ON DELETE CASCADE
);

CREATE INDEX "Notification.userId_idx" ON public."Notification" (userId);
CREATE INDEX "Notification.isRead_idx" ON public."Notification" (isRead);
CREATE INDEX "Notification.type_idx" ON public."Notification" (type);
CREATE INDEX "Notification.createdAt_idx" ON public."Notification" (createdAt);

-- NextAuth compatibility tables
CREATE TABLE public."Account" (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  userId            TEXT NOT NULL,
  type              TEXT NOT NULL,
  provider          TEXT NOT NULL,
  providerAccountId TEXT NOT NULL,
  refresh_token     TEXT,
  access_token      TEXT,
  expires_at        INTEGER,
  token_type        TEXT,
  scope             TEXT,
  id_token          TEXT,
  session_state     TEXT,
  CONSTRAINT "Account.userId_fkey" FOREIGN KEY (userId) REFERENCES public."User"(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX "Account.provider_providerAccountId_key" ON public."Account" (provider, providerAccountId);

CREATE TABLE public."Session" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sessionToken TEXT UNIQUE NOT NULL,
  userId       TEXT NOT NULL,
  expires      TIMESTAMPTZ NOT NULL,
  CONSTRAINT "Session.userId_fkey" FOREIGN KEY (userId) REFERENCES public."User"(id) ON DELETE CASCADE
);

CREATE TABLE public."VerificationToken" (
  identifier TEXT NOT NULL,
  token      TEXT UNIQUE NOT NULL,
  expires    TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX "VerificationToken.identifier_token_key" ON public."VerificationToken" (identifier, token);
