"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { useUbahQuery } from "./filter-samping";

function nomorHalaman(sekarang: number, total: number): (number | "…")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (sekarang <= 3) return [1, 2, 3, "…", total];
  if (sekarang >= total - 2) return [1, "…", total - 2, total - 1, total];
  const hasil: (number | "…")[] = [1];
  const mulai = Math.max(2, sekarang - 1), akhir = Math.min(total - 1, sekarang + 1);
  if (mulai > 2) hasil.push("…");
  for (let i = mulai; i <= akhir; i++) hasil.push(i);
  if (akhir < total - 1) hasil.push("…");
  hasil.push(total);
  return hasil;
}

export function Paginasi({ halaman, total }: { halaman: number; total: number }) {
  const ubah = useUbahQuery();
  if (total <= 1) return null;
  const pergi = (n: number) => ubah({ halaman: n > 1 ? String(n) : null }, false);
  const dasar = "flex h-6 min-w-6 items-center justify-center rounded text-[11px]";
  return (
    <nav aria-label="Halaman" className="flex items-center gap-1.5">
      <button disabled={halaman <= 1} onClick={() => pergi(halaman - 1)} aria-label="Sebelumnya" className={`${dasar} text-tinta-lembut disabled:opacity-40`}><ChevronLeft size={13} /></button>
      {nomorHalaman(halaman, total).map((n, i) =>
        n === "…" ? <span key={`e${i}`} className="px-1 text-[11px] text-tinta-lembut">…</span> : (
          <button key={n} onClick={() => pergi(n)} aria-current={n === halaman ? "page" : undefined}
            className={`${dasar} ${n === halaman ? "bg-marun text-krem" : "text-tinta-lembut hover:text-marun"}`}>{n}</button>
        ))}
      <button disabled={halaman >= total} onClick={() => pergi(halaman + 1)} aria-label="Berikutnya" className={`${dasar} text-tinta-lembut disabled:opacity-40`}><ChevronRight size={13} /></button>
    </nav>
  );
}
