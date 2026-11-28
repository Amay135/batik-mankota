"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api, pesanAksi } from "@/lib/api";
import { rupiah, waktuJakarta } from "@/lib/format";
import type { RingkasanDasbor } from "@/types/skema";

import { EmptyState, ErrorState, Memuat } from "./keadaan";

type Kartu = { label: string; nilai: string; catatan?: string };

/** KPI dashboard admin. Angka dihitung backend; komponen ini hanya menampilkan. */
export function PanelRingkasan() {
  const [data, setData] = useState<RingkasanDasbor | null>(null);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    api<RingkasanDasbor>("/laporan/ringkasan/")
      .then(setData)
      .catch((err) => setGalat(pesanAksi(err) || "Gagal memuat ringkasan."));
  }, []);

  if (galat) return <ErrorState pesan={galat} />;
  if (!data) return <Memuat pesan="Memuat ringkasan..." />;

  const kartu: Kartu[] = [
    {
      label: "Penjualan hari ini",
      nilai: rupiah(data.penjualan_hari_ini),
      catatan: "Hanya pesanan yang sudah dibayar",
    },
    { label: "Pesanan hari ini", nilai: String(data.pesanan_hari_ini) },
    {
      label: "Menunggu pembayaran",
      nilai: String(data.pesanan_menunggu_pembayaran),
    },
    { label: "Produk terjual hari ini", nilai: String(data.produk_terjual_hari_ini) },
    { label: "Varian stok menipis", nilai: String(data.varian_stok_menipis) },
    { label: "Varian stok habis", nilai: String(data.varian_stok_habis) },
  ];

  return (
    <div className="space-y-6">
      <section aria-label="Ringkasan operasional">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {kartu.map((item) => (
            <div key={item.label} className="panel-dasbor">
              <p className="text-[11px] uppercase tracking-wide text-dash-text-muted">
                {item.label}
              </p>
              <p className="mt-1 break-words font-serif text-[26px] leading-tight">
                {item.nilai}
              </p>
              {item.catatan && (
                <p className="mt-1 text-[11px] text-dash-text-muted">{item.catatan}</p>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-dash-text-muted">
          Hari operasional memakai zona waktu Asia/Jakarta.
        </p>
      </section>

      <section className="panel-dasbor" aria-labelledby="aktivitas-admin">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="aktivitas-admin" className="font-sans text-[13px] font-semibold">
            Aktivitas admin terbaru
          </h2>
          <Link
            href="/dashboard/audit"
            className="tombol-sekunder h-8 px-3 text-[11.5px]"
          >
            Lihat log audit
          </Link>
        </div>
        {data.aktivitas.length === 0 ? (
          <EmptyState pesan="Belum ada aktivitas admin." />
        ) : (
          <ul className="mt-2 divide-y divide-dash-border">
            {data.aktivitas.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2 text-[12px]"
              >
                <span>
                  <b>{a.aksi_label}</b> · {a.pelaku}
                  {a.entity && (
                    <span className="text-dash-text-muted">
                      {" "}
                      · {a.entity}
                      {a.entity_id && ` #${a.entity_id}`}
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-dash-text-muted">
                  {waktuJakarta(a.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
