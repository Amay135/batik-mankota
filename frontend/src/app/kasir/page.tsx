"use client";

import Link from "next/link";
import { useState } from "react";
import PanelKeranjang from "@/components/kasir/panel-keranjang";
import PanelProduk from "@/components/kasir/panel-produk";
import type { CartLine } from "@/components/kasir/data";

export default function KasirPage() {
  const [cart, setCart] = useState<CartLine[]>([
    { id: 1, qty: 1 },
    { id: 2, qty: 1 },
  ]);

  const addItem = (id: number) =>
    setCart((c) =>
      c.some((i) => i.id === id)
        ? c.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i))
        : [...c, { id, qty: 1 }]
    );
  const changeQty = (id: number, d: number) =>
    setCart((c) =>
      c.map((i) => (i.id === id ? { ...i, qty: i.qty + d } : i)).filter((i) => i.qty > 0)
    );
  const removeItem = (id: number) => setCart((c) => c.filter((i) => i.id !== id));

  return (
    <main className="flex-1 px-8 pb-3 pt-6">
      <h1 className="mb-1 font-serif text-[26px] font-normal">Kasir &amp; Penjualan</h1>
      <p className="mb-4 text-[#8a7f73]">
        Transaksi cepat, perayaan hangat. Semua penjualan tercatat di satu tempat.
      </p>

      <div className="mb-[18px] flex items-center justify-between border-y border-[#e8dfcf] px-1 py-2.5 text-[11px] text-[#8a7f73]">
        <span>
          Shift aktif{" "}
          <b className="ml-2.5 font-medium text-[#2b2420]">
            Kasir: Ayu Pramesti · Dibuka 09.00 WIB · Saldo awal Rp500.000
          </b>
        </span>
        <span className="flex gap-[22px] text-[#2b2420]">
          <Link href="/kasir/riwayat">Riwayat transaksi</Link>
          <span className="font-medium text-[#6b2430]">Tutup shift →</span>
        </span>
      </div>

      <div className="grid grid-cols-1 items-start gap-[22px] min-[1101px]:grid-cols-[minmax(0,1fr)_320px]">
        <PanelProduk onAdd={addItem} />
        <PanelKeranjang
          cart={cart}
          onChangeQty={changeQty}
          onRemove={removeItem}
          onClear={() => setCart([])}
        />
      </div>
    </main>
  );
}