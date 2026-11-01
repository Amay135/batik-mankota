"use client";

import { useMemo, useState } from "react";
import { rupiah } from "@/lib/format";
import { CATEGORIES, PRODUCTS } from "./data";
import { PlusIcon, ScanIcon, SearchIcon } from "./icons";

export default function PanelProduk({ onAdd }: { onAdd: (id: number) => void }) {
  const [category, setCategory] = useState("Semua");
  const [query, setQuery] = useState("");

  const products = useMemo(
    () =>
      PRODUCTS.filter(
        (p) =>
          (category === "Semua" || p.cat === category) &&
          p.name.toLowerCase().includes(query.toLowerCase())
      ),
    [category, query]
  );

  return (
    <section>
      <div className="flex gap-2.5">
        <label className="flex h-[38px] flex-1 items-center gap-2 rounded-[7px] border border-[#e8dfcf] bg-white px-3 text-[#8a7f73]">
          <SearchIcon size={16} />
          <input
            className="flex-1 border-0 bg-transparent text-xs text-[#2b2420] outline-none"
            placeholder="Cari produk, SKU, atau pindai barcode..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button className="flex h-[38px] cursor-pointer items-center gap-1.5 rounded-[7px] border border-[#e8dfcf] bg-white px-4 font-semibold text-[#6b2430]">
          <ScanIcon size={16} /> Pindai
        </button>
      </div>

      <div className="mb-2.5 mt-3.5 flex gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`cursor-pointer rounded-md border px-3.5 py-1.5 text-[11px] ${
              c === category
                ? "border-[#6b2430] bg-[#6b2430] text-white"
                : "border-[#e8dfcf] bg-white text-[#2b2420]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mb-2.5 flex justify-between text-[10.5px] text-[#8a7f73]">
        <span>48 produk tersedia</span>
        <span>Harga retail · Cabang Laweyan</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {products.map((p) => (
          <article key={p.id} className="rounded-lg border border-[#e8dfcf] bg-white px-2 pb-2.5 pt-2">
            <div className="relative mb-2 aspect-[1/0.82] overflow-hidden rounded-md" style={{ background: p.tone }}>
              <img
                className="absolute inset-0 size-full object-cover"
                src={p.img}
                alt={p.name}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </div>
            <div className="text-[9.5px] text-[#8a7f73]">{p.cat} · {p.type}</div>
            <div className="my-[3px] text-[13px] font-bold">{p.name}</div>
            <div className="mb-2 text-xs font-semibold">{rupiah(p.price)}</div>
            <div className="flex items-center justify-between text-[10px] text-[#8a7f73]">
              <span>Stok {p.stock}</span>
              <button
                className="grid size-6 cursor-pointer place-items-center rounded-md border-0 bg-[#f5efe3] text-[#6b2430]"
                onClick={() => onAdd(p.id)}
                aria-label={`Tambah ${p.name}`}
              >
                <PlusIcon size={14} />
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-3.5 flex justify-between px-1 text-[10px] text-[#8a7f73]">
        <span>F2 Cari produk</span>
        <span>F4 Pilih pelanggan</span>
        <span>F8 Bayar transaksi</span>
      </div>
    </section>
  );
}