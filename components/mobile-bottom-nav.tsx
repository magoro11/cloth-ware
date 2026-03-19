"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard, MessageSquare, Search, Store } from "lucide-react";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/marketplace", label: "Explore", icon: Search },
  { href: "/list-item", label: "Sell", icon: Store },
  { href: "/messages", label: "Chat", icon: MessageSquare },
  { href: "/dashboard", label: "Account", icon: LayoutDashboard },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-[var(--surface)]/95 px-2 py-2 backdrop-blur dark:border-white/10 md:hidden">
      <ul className="grid grid-cols-5 gap-1">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`flex flex-col items-center rounded-xl px-2 py-1.5 text-[11px] transition ${
                  active ? "bg-black text-white dark:bg-white dark:text-black" : "opacity-75"
                }`}
              >
                <Icon className="mb-1 size-4" />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
