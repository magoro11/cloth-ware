"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded-full border border-white/20 bg-black/5 p-2 transition hover:scale-105 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
      aria-label="Toggle theme"
    >
      {!mounted ? <span className="block size-4" /> : isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
