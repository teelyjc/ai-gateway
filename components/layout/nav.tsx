"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/keys", label: "Keys" },
  { href: "/models", label: "Models" },
  { href: "/usage", label: "Usage" },
  { href: "/agents", label: "Agent configs" },
  { href: "/users", label: "Users", adminOnly: true },
];

export function Nav({ role }: { role?: "admin" | "user" }) {
  const pathname = usePathname();

  const visibleItems = navItems.filter((item) => !item.adminOnly || role === "admin");

  return (
    <div className="flex flex-col gap-0.5">
      {visibleItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
    </div>
  );
}
