"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { API } from "./api";

// Sementara. Bila skema /auth/saya/ sudah ada di types/api.d.ts, ganti dengan tipe hasil generate.
export type Pengguna = { email: string; nama_lengkap?: string | null; role?: string };
type Status = { pengguna: Pengguna | null; selesai: boolean };

const Ctx = createContext<Status>({ pengguna: null, selesai: false });

export function PenggunaProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>({ pengguna: null, selesai: false });

  useEffect(() => {
    let batal = false;
    fetch(`${API}/auth/saya/`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d) => {
        if (!batal) setStatus({ pengguna: d, selesai: true });
      });
    return () => {
      batal = true;
    };
  }, []);

  return <Ctx.Provider value={status}>{children}</Ctx.Provider>;
}

export const usePengguna = () => useContext(Ctx);

const LABEL_ROLE: Record<string, string> = { kasir: "Kasir", admin: "Admin", user: "Pelanggan" };

export function namaTampil({ pengguna, selesai }: Status): string {
  return pengguna?.nama_lengkap || pengguna?.email || (selesai ? "Pengguna" : "Memuat...");
}

export function labelRole(pengguna: Pengguna | null): string {
  return pengguna?.role ? (LABEL_ROLE[pengguna.role] ?? pengguna.role) : "";
}

export function inisial(teks: string): string {
  const bagian = teks.split(/[\s@._-]+/).filter(Boolean);
  return ((bagian[0]?.[0] ?? "?") + (bagian[1]?.[0] ?? "")).toUpperCase();
}