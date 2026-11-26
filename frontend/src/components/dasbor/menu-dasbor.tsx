"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ADMIN_MENU } from "@/lib/admin-menu";

function DaftarMenu({ onPilih }: { onPilih?: () => void }) {
  const path = usePathname();

  return (
    <nav aria-label="Menu dashboard" className="space-y-4">
      {ADMIN_MENU.map((grup) => (
        <div key={grup.judul}>
          <p className="mb-1 px-3 text-[10.5px] uppercase tracking-wide text-dash-text-muted">{grup.judul}</p>
          <ul className="space-y-1">
            {grup.item.map((menu) => {
              if (!menu.href) {
                return (
                  <li key={menu.label}>
                    <span
                      aria-disabled="true"
                      className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-[12.5px] text-dash-text-muted"
                    >
                      {menu.label}
                      <span className="rounded border border-dash-border px-1.5 text-[10px]">Segera</span>
                    </span>
                  </li>
                );
              }
              const aktif = menu.href === "/dashboard" ? path === menu.href : path.startsWith(menu.href);
              return (
                <li key={menu.label}>
                  <Link
                    href={menu.href}
                    data-menu-id={menu.id}
                    aria-current={aktif ? "page" : undefined}
                    onClick={onPilih}
                    className={`block rounded-md px-3 py-2 text-[12.5px] transition-colors ${
                      aktif ? "bg-dash-primary text-dash-on-primary" : "text-dash-text hover:bg-dash-bg-alt"
                    }`}
                  >
                    {menu.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Sidebar desktop + drawer mobile (dialog native: fokus terkurung, Esc menutup). */
export function MenuDasbor() {
  const [buka, setBuka] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const path = usePathname();

  useEffect(() => {
    setBuka(false);
  }, [path]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (buka && !dialog.open) dialog.showModal();
    else if (!buka && dialog.open) dialog.close();
  }, [buka]);

  return (
    <>
      <div className="md:hidden">
        <button
          type="button"
          className="tombol-sekunder w-full"
          aria-haspopup="dialog"
          aria-expanded={buka}
          onClick={() => setBuka(true)}
        >
          Menu
        </button>
      </div>

      <aside className="hidden md:block md:w-48 md:shrink-0">
        <DaftarMenu />
      </aside>

      <dialog
        ref={dialogRef}
        aria-label="Navigasi dashboard"
        onClose={() => setBuka(false)}
        onClick={(e) => e.target === e.currentTarget && setBuka(false)}
        className="fixed inset-y-0 left-0 m-0 h-full max-h-none w-72 max-w-[85vw] overflow-y-auto rounded-none border-0 bg-dash-surface p-4 text-dash-text"
      >
        {buka && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-serif text-lg">Mankota</span>
              <button
                type="button"
                className="tombol-sekunder h-8 px-3 text-[11.5px]"
                onClick={() => setBuka(false)}
              >
                Tutup
              </button>
            </div>
            <DaftarMenu onPilih={() => setBuka(false)} />
          </>
        )}
      </dialog>
    </>
  );
}
