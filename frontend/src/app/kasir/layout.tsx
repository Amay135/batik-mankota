"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BellIcon, CartIcon, Chevron, Logo, ReceiptIcon, } from "@/components/kasir/icons";

const NAV = [
  { href: "/kasir", label: "Kasir & Penjualan", Icon: CartIcon },
  { href: "/kasir/riwayat", label: "Riwayat Transaksi", Icon: ReceiptIcon },
];

export default function KasirLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const current = NAV.find((n) => n.href === pathname) ?? NAV[0];

  return (
    <div className="flex min-h-screen bg-[#f5efe3] text-xs text-[#2b2420]">
      <aside className="w-[230px] shrink-0 bg-[#6b2430] px-4 py-[18px] text-[#f3e6d6]">
        <div className="mb-[26px] flex items-center gap-2.5">
          <Logo />
          <div>
            <div className="font-serif text-xl leading-none text-white">Mankota</div>
            <div className="mt-1 text-[7px] tracking-[1.2px] text-[#e9c58a]">BATIK • BANGUN KUASATARA</div>
          </div>
        </div>

        <div className="mb-1.5 ml-0.5 text-[9px] tracking-[1px] text-[#d9b9ac]">TOKO AKTIF</div>
        <button className="flex w-full cursor-pointer items-center justify-between rounded-md border border-white/30 bg-transparent px-2.5 py-2 text-xs text-white">
          <span>Mankota · Laweyan</span>
          <Chevron size={14} />
        </button>

        <div className="mb-1.5 ml-0.5 mt-[18px] text-[9px] tracking-[1px] text-[#d9b9ac]">RUANG KERJA</div>
        <nav className="flex flex-col gap-1.5">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-[7px] px-3 py-2.5 text-xs ${
                pathname === href
                  ? "bg-[#f5efe3] font-semibold text-[#6b2430]"
                  : "text-[#f3e6d6]"
              }`}
            >
              <Icon /> {label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[52px] items-center justify-between border-b border-[#e8dfcf] bg-white px-6">
          <div className="text-[#8a7f73]">
            Operasional / <b className="font-medium text-[#2b2420]">{current.label}</b>
          </div>
          <div className="flex items-center gap-[18px]">
            <button className="cursor-pointer border-0 bg-transparent text-[#6b2430]">
              <BellIcon size={17} />
            </button>
            <div className="flex items-center gap-2">
              <span className="grid size-[26px] place-items-center rounded-full bg-[#b87a3d] text-[10px] font-semibold text-white">
                AP
              </span>
              <span>
                <div className="text-[11px] font-semibold">Ayu Pramesti</div>
                <div className="text-[10px] text-[#8a7f73]">Pemilik toko</div>
              </span>
            </div>
          </div>
        </header>

        {children}

        <footer className="flex justify-between px-8 py-3.5 text-[9.5px] text-[#8a7f73]">
          <span>Batik Mankota · Ruang operasional</span>
          <span>Terakhir diperbarui 12 Okt 2026, 10.42 WIB</span>
        </footer>
      </div>
    </div>
  );
}