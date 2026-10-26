"use client";

import { ChevronDown, LayoutGrid, List, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useUbahQuery } from "./filter-samping";

const URUT = [
  ["populer", "Paling populer"],
  ["terbaru", "Terbaru"],
  ["harga-terendah", "Harga terendah"],
  ["harga-tertinggi", "Harga tertinggi"],
] as const;

export function BilahKatalog({ judul, jumlah }: { judul: string; jumlah: number }) {
  const sp = useSearchParams();
  const ubah = useUbahQuery();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const urut = sp.get("urut") ?? "populer";
  const tampilan = sp.get("tampilan") === "daftar" ? "daftar" : "grid";

  useEffect(() => { setQ(sp.get("q") ?? ""); }, [sp]);

  function cari(v: string) {
    setQ(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => ubah({ q: v.trim() || null }), 350);
  }

  return (
    <>
      <div className="flex gap-3">
        <label className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-lembut" />
          <input value={q} onChange={(e) => cari(e.target.value)} placeholder="Cari motif atau nama produk..."
            className="h-[38px] w-full rounded-md border border-transparent bg-white pl-9 pr-3 text-[12px] placeholder:text-tinta-lembut/70 focus:border-marun focus:outline-none" />
        </label>
        <label className="relative">
          <select value={urut} onChange={(e) => ubah({ urut: e.target.value === "populer" ? null : e.target.value })}
            aria-label="Urutkan"
            className="h-[38px] w-[196px] cursor-pointer appearance-none rounded-md border border-transparent bg-white pl-3 pr-8 text-[12px] focus:border-marun focus:outline-none">
            {URUT.map(([v, l]) => <option key={v} value={v}>Urutkan: {l}</option>)}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-tinta-lembut" />
        </label>
      </div>
      <div className="mb-4 mt-4 flex items-center justify-between text-[11px] text-tinta-lembut">
        <p><span className="text-tinta">{judul}</span><span className="ml-3">{jumlah} produk untuk Anda</span></p>
        <div className="flex gap-2.5">
          <button aria-label="Tampilan grid" onClick={() => ubah({ tampilan: null }, false)} className={tampilan === "grid" ? "text-marun" : "hover:text-tinta"}><LayoutGrid size={15} /></button>
          <button aria-label="Tampilan daftar" onClick={() => ubah({ tampilan: "daftar" }, false)} className={tampilan === "daftar" ? "text-marun" : "hover:text-tinta"}><List size={15} /></button>
        </div>
      </div>
    </>
  );
}
