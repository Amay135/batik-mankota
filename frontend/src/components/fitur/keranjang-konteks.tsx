"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import type { Keranjang } from "@/types/pesanan";

interface Nilai {
  keranjang: Keranjang | null;
  muat: boolean;
  jumlah: number;
  setKeranjang: (k: Keranjang) => void;
  segarkan: () => Promise<void>;
  tambah: (varianId: number, jumlah: number) => Promise<Keranjang>;
  ubahJumlah: (itemId: number, jumlah: number) => Promise<Keranjang>;
  hapus: (itemId: number) => Promise<Keranjang>;
  pakaiVoucher: (kode: string) => Promise<Keranjang>;
  lepasVoucher: () => Promise<Keranjang>;
}

const Konteks = createContext<Nilai | null>(null);

export function useKeranjang() {
  const v = useContext(Konteks);
  if (!v) throw new Error("useKeranjang harus di dalam KeranjangProvider");
  return v;
}

export function KeranjangProvider({ children }: { children: React.ReactNode }) {
  const [keranjang, setKeranjang] = useState<Keranjang | null>(null);
  const [muat, setMuat] = useState(true);

  const segarkan = useCallback(async () => {
    try {
      setKeranjang(await api<Keranjang>("/keranjang/"));
    } finally {
      setMuat(false);
    }
  }, []);

  useEffect(() => { void segarkan(); }, [segarkan]);

  const simpan = useCallback(async (p: Promise<Keranjang>) => {
    const k = await p;
    setKeranjang(k);
    return k;
  }, []);

  const nilai = useMemo<Nilai>(() => ({
    keranjang,
    muat,
    jumlah: keranjang?.ringkasan.jumlah_barang ?? 0,
    setKeranjang,
    segarkan,
    tambah: (varianId, jumlah) => simpan(api("/keranjang/item/", { method: "POST", body: { varian_id: varianId, jumlah } })),
    ubahJumlah: (id, jumlah) => simpan(api(`/keranjang/item/${id}/`, { method: "PATCH", body: { jumlah } })),
    hapus: (id) => simpan(api(`/keranjang/item/${id}/`, { method: "DELETE" })),
    pakaiVoucher: (kode) => simpan(api("/keranjang/voucher/", { method: "POST", body: { kode } })),
    lepasVoucher: () => simpan(api("/keranjang/voucher/", { method: "DELETE" })),
  }), [keranjang, muat, segarkan, simpan]);

  return <Konteks.Provider value={nilai}>{children}</Konteks.Provider>;
}
