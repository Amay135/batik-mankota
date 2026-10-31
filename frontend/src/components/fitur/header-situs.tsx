"use client";

import { Search, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Logo } from "@/components/ui/ornamen";
import { api } from "@/lib/api";
import { SITUS } from "@/lib/situs";
import type { Pengguna } from "@/types/pesanan";

import { useKeranjang } from "./keranjang-konteks";

const NAV = [
  { href: "/koleksi", label: "Beranda", aktif: (p: string) => p === "/" },
  { href: "/koleksi", label: "Koleksi", aktif: (p: string) => p.startsWith("/koleksi") || p.startsWith("/produk") },
  { href: "#", label: "Cerita Kami", aktif: () => false },
  { href: "#", label: "Panduan Batik", aktif: () => false },
];

export function PengumumanBar() {
  return (
    <div className="bg-marun py-[7px] text-center text-[10.5px] tracking-wide text-krem">{SITUS.pengumuman}</div>
  );
}

export function HeaderSitus({ pengguna }: { pengguna: Pengguna }) {
  const path = usePathname();
  const router = useRouter();
  const { jumlah } = useKeranjang();
  const [buka, setBuka] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tutup = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setBuka(false); };
    document.addEventListener("mousedown", tutup);
    return () => document.removeEventListener("mousedown", tutup);
  }, []);

  async function keluar() {
    await api("/auth/keluar/", { method: "POST" });
    router.replace("/masuk");
    router.refresh();
  }

  return (
    <header className="border-b border-garis bg-krem">
      <div className="wadah flex h-[62px] items-center justify-between">
        <Link href="/koleksi" aria-label="Mankota, beranda"><Logo /></Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 gap-10 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className={`text-[12.5px] transition-colors hover:text-marun ${n.aktif(path) ? "font-semibold text-tinta" : "text-tinta-lembut"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5 text-tinta">
          <Link href="/koleksi" aria-label="Cari produk"><Search size={16} strokeWidth={1.6} /></Link>
          <div className="relative" ref={ref}>
            <button onClick={() => setBuka((b) => !b)} aria-label="Akun" aria-expanded={buka}>
              <User size={16} strokeWidth={1.6} />
            </button>
            {buka && (
              <div className="absolute right-0 top-8 z-30 w-52 rounded-md border border-garis bg-white p-3 shadow-lg">
                <p className="truncate text-[12.5px] font-semibold">{pengguna.nama_lengkap || "Akun saya"}</p>
                <p className="truncate text-[11px] text-tinta-lembut">{pengguna.email}</p>
                <button onClick={keluar} className="mt-3 w-full rounded border border-garis py-1.5 text-[12px] hover:border-marun hover:text-marun">
                  Keluar
                </button>
              </div>
            )}
          </div>
          {pengguna.role === "user" && (
            <Link href="/checkout" className="flex items-center gap-1.5" aria-label={`Keranjang, ${jumlah} barang`}>
              <ShoppingBag size={16} strokeWidth={1.6} />
              <span className="text-[11px]">{jumlah}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
