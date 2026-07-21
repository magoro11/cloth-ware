"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

async function fetchCartCount() {
  const response = await fetch("/api/cart", { cache: "no-store" });
  if (!response.ok) return 0;
  const payload = await response.json();
  return typeof payload.count === "number" ? payload.count : 0;
}

export function CartLink({ mobile = false }: { mobile?: boolean }) {
  const { data } = useSession();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!data?.user) {
      setCount(0);
      return;
    }

    void fetchCartCount().then(setCount);

    function handleCartChanged(event: Event) {
      const nextCount = (event as CustomEvent<{ count?: number }>).detail?.count;
      if (typeof nextCount === "number") {
        setCount(nextCount);
        return;
      }
      void fetchCartCount().then(setCount);
    }

    window.addEventListener("cart:changed", handleCartChanged);
    return () => window.removeEventListener("cart:changed", handleCartChanged);
  }, [data?.user]);

  const badge = count > 0 ? (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-black px-1.5 text-[10px] text-white dark:bg-white dark:text-black">
      {count}
    </span>
  ) : null;

  if (mobile) {
    return (
      <Link href="/cart" className="inline-flex items-center gap-2 hover:opacity-70">
        <ShoppingBag className="size-4" />
        Cart
        {badge}
      </Link>
    );
  }

  return (
    <Link href="/cart" className="inline-flex items-center gap-2 hover:opacity-70">
      <ShoppingBag className="size-4" />
      Cart
      {badge}
    </Link>
  );
}
