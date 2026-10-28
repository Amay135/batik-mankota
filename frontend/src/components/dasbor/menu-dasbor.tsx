"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ADMIN_MENU } from "@/lib/admin-menu";

export function MenuDasbor() {
  const path = usePathname();
  return (
    <nav aria-label="Menu dashboard" className="space-y-1">
      {ADMIN_MENU.map((m) => {
        const aktif = m.href === "/dashboard" ? path === m.href : path.startsWith(m.href);
        return (
          <Link
            key={m.id}
            href={m.href}
            data-menu-id={m.id}
            aria-current={aktif ? "page" : undefined}
            className={`block rounded-md px-3 py-2 text-[12.5px] transition-colors ${
              aktif ? "bg-dash-primary text-dash-on-primary" : "text-dash-text hover:bg-dash-bg-alt"
            }`}
          >
            {m.label}
          </Link>
        );
      })}
    </nav>
  );
}
