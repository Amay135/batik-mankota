"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/lib/api";

export function TombolKeluar() {
  const router = useRouter();
  const [proses, setProses] = useState(false);

  async function keluar() {
    setProses(true);
    try {
      await api("/auth/keluar/", { method: "POST" });
    } catch {
      // Sesi mungkin sudah habis; tetap arahkan ke halaman masuk.
    }
    router.replace("/masuk");
    router.refresh();
  }

  return (
    <button type="button" className="tombol-sekunder h-8 px-3 text-[11.5px]" onClick={keluar} disabled={proses}>
      {proses ? "Keluar..." : "Keluar"}
    </button>
  );
}
