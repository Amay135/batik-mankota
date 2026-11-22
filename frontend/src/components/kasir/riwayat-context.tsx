"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

// SEMENTARA: riwayat disimpan di browser sampai endpoint POST /kasir/transaksi/ tersedia.
const KUNCI = "kasir-riwayat-v1";
const NOMOR_AWAL = 328;

export type BarisStruk = { id: number; name: string; qty: number; price: number };

export type Transaksi = {
  nomor: string;
  waktu: string; // ISO
  kasir: string;
  metode: string;
  items: BarisStruk[];
  subtotal: number;
  discountPct: number;
  discount: number;
  total: number;
  cash: number;
  change: number;
};

type Nilai = {
  daftar: Transaksi[];
  siap: boolean;
  nomorBerikut: string;
  tambah: (t: Transaksi) => void;
};

const Ctx = createContext<Nilai>({ daftar: [], siap: false, nomorBerikut: "#TRX-0328", tambah: () => {} });

export function formatWaktu(d: Date): string {
  const tanggal = d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
  const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" });
  return `${tanggal}, ${jam} WIB`;
}

export function RiwayatProvider({ children }: { children: ReactNode }) {
  const [daftar, setDaftar] = useState<Transaksi[]>([]);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    try {
      const mentah = localStorage.getItem(KUNCI);
      if (mentah) {
        const data: unknown = JSON.parse(mentah);
        if (Array.isArray(data)) setDaftar(data as Transaksi[]);
      }
    } catch {
      // penyimpanan tidak tersedia: lanjut dengan daftar kosong
    }
    setSiap(true);
  }, []);

  useEffect(() => {
    if (!siap) return;
    try {
      localStorage.setItem(KUNCI, JSON.stringify(daftar));
    } catch {
      // abaikan
    }
  }, [daftar, siap]);

  const tambah = useCallback((t: Transaksi) => setDaftar((prev) => [t, ...prev]), []);

  const nomorBerikut = `#TRX-${String(NOMOR_AWAL + daftar.length).padStart(4, "0")}`;

  return <Ctx.Provider value={{ daftar, siap, nomorBerikut, tambah }}>{children}</Ctx.Provider>;
}

export const useRiwayat = () => useContext(Ctx);