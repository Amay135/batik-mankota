"use client";

import Link from "next/link";
import { rupiah } from "@/lib/format";
import { formatWaktu, useRiwayat } from "@/components/kasir/riwayat-context";

const KOLOM = "grid grid-cols-[1fr_1.5fr_1.2fr_0.8fr_0.7fr_1fr] gap-3";

export default function RiwayatPage() {
  const { daftar, siap } = useRiwayat();
  const totalPenjualan = daftar.reduce((a, t) => a + t.total, 0);

  return (
    <main className="flex-1 px-8 pb-3 pt-6">
      <h1 className="mb-1 text-[26px] font-normal">Riwayat Transaksi</h1>
      <p className="mb-4 text-[#8a7f73]">Daftar transaksi yang sudah tercatat.</p>

      {!siap ? null : daftar.length === 0 ? (
        <div className="rounded-lg border border-[#e8dfcf] bg-white p-8 text-center text-[#8a7f73]">
          <p className="mb-3">Belum ada transaksi.</p>
          <Link href="/kasir" className="font-medium text-[#6b2430]">
            Mulai transaksi →
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-3 flex gap-6 text-[11px] text-[#8a7f73]">
            <span>
              Jumlah transaksi <b className="ml-1 font-semibold text-[#2b2420]">{daftar.length}</b>
            </span>
            <span>
              Total penjualan <b className="ml-1 font-semibold text-[#2b2420]">{rupiah(totalPenjualan)}</b>
            </span>
          </div>

          <div className="rounded-lg border border-[#e8dfcf] bg-white">
            <div className={`${KOLOM} border-b border-[#e8dfcf] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[#8a7f73]`}>
              <span>No.</span>
              <span>Waktu</span>
              <span>Kasir</span>
              <span>Metode</span>
              <span>Item</span>
              <span className="text-right">Total</span>
            </div>

            {daftar.map((t) => (
              <details key={t.nomor + t.waktu} className="group border-b border-[#e8dfcf] last:border-b-0">
                <summary className={`${KOLOM} cursor-pointer list-none px-4 py-3 text-[11px] hover:bg-[#faf6ee] [&::-webkit-details-marker]:hidden`}>
                  <span className="font-semibold">{t.nomor}</span>
                  <span>{formatWaktu(new Date(t.waktu))}</span>
                  <span className="truncate">{t.kasir}</span>
                  <span>{t.metode}</span>
                  <span>{t.items.reduce((a, i) => a + i.qty, 0)} pcs</span>
                  <span className="text-right font-semibold">{rupiah(t.total)}</span>
                </summary>

                <div className="border-t border-dashed border-[#e8dfcf] bg-[#faf6ee] px-4 py-3 text-[11px]">
                  {t.items.map((i) => (
                    <div key={i.id} className="flex justify-between py-0.5">
                      <span>
                        {i.name} <span className="text-[#8a7f73]">({i.qty} x {rupiah(i.price)})</span>
                      </span>
                      <span>{rupiah(i.qty * i.price)}</span>
                    </div>
                  ))}
                  <div className="mt-2 flex flex-col items-end gap-0.5 border-t border-[#e8dfcf] pt-2">
                    <span>Subtotal {rupiah(t.subtotal)}</span>
                    {t.discount > 0 && <span>Diskon ({t.discountPct}%) −{rupiah(t.discount)}</span>}
                    {t.metode === "Tunai" && (
                      <>
                        <span>Uang diterima {rupiah(t.cash)}</span>
                        <span>Kembalian {rupiah(t.change)}</span>
                      </>
                    )}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </>
      )}
    </main>
  );
}