"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { api, pesanAksi } from "@/lib/api";
import { rupiah, tanggalJakarta } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  HalamanPelanggan,
  Pelanggan,
  RingkasanPelanggan,
} from "@/types/skema";

import { DataTable, type Sortir } from "./data-table";
import { FormPelanggan } from "./form-pelanggan";
import { EmptyState, ErrorState } from "./keadaan";

// Sama dengan PelangganPagination.page_size di backend.
const PER_HALAMAN = 25;

function KartuStatistik({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="panel-dasbor">
      <p className="text-[11px] uppercase tracking-wide text-dash-text-muted">{label}</p>
      <p className="mt-1 break-words font-serif text-[22px] leading-tight">{nilai}</p>
    </div>
  );
}

function MemuatTabel() {
  return (
    <div role="status" aria-label="Memuat pelanggan" className="space-y-2">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

export function DaftarPelanggan() {
  const [data, setData] = useState<HalamanPelanggan | null>(null);
  const [ringkasan, setRingkasan] = useState<RingkasanPelanggan | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");
  const [galatRingkasan, setGalatRingkasan] = useState("");
  const [cari, setCari] = useState("");
  const [q, setQ] = useState("");
  const [halaman, setHalaman] = useState(1);
  const [sortir, setSortir] = useState<Sortir | null>(null);
  const [form, setForm] = useState<{ terbuka: boolean; pelanggan: Pelanggan | null }>({
    terbuka: false,
    pelanggan: null,
  });

  // Ketik cepat tidak membanjiri API; pencarian tetap di server.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(cari.trim());
      setHalaman(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [cari]);

  const muatRingkasan = useCallback(async () => {
    try {
      setRingkasan(await api<RingkasanPelanggan>("/pelanggan/ringkasan/"));
      setGalatRingkasan("");
    } catch (err) {
      // Statistik tambahan; kegagalannya tidak boleh menutup daftar pelanggan.
      setGalatRingkasan(pesanAksi(err) || "Gagal memuat ringkasan pelanggan.");
    }
  }, []);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat("");
    const params = new URLSearchParams({ page: String(halaman) });
    if (q) params.set("q", q);
    if (sortir) {
      params.set("sortir", sortir.id);
      params.set("arah", sortir.arah);
    }
    try {
      setData(await api<HalamanPelanggan>(`/pelanggan/?${params}`));
    } catch (err) {
      setGalat(pesanAksi(err) || "Gagal memuat pelanggan.");
    } finally {
      setMemuat(false);
    }
  }, [halaman, q, sortir]);

  useEffect(() => {
    void muat();
  }, [muat]);

  useEffect(() => {
    void muatRingkasan();
  }, [muatRingkasan]);

  const kolom: ColumnDef<Pelanggan, unknown>[] = [
    {
      id: "nama",
      header: "Pelanggan",
      cell: ({ row }) => (
        <>
          {row.original.nama}
          {row.original.alamat && (
            <span className="block max-w-[220px] truncate text-[10.5px] text-dash-text-muted">
              {row.original.alamat}
            </span>
          )}
        </>
      ),
    },
    {
      id: "kontak",
      header: "Kontak",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{row.original.telepon || "—"}</span>
      ),
    },
    {
      id: "email",
      header: "Email",
      enableSorting: false,
      cell: ({ row }) => row.original.email || "—",
    },
    {
      id: "transaksi",
      header: "Total Transaksi",
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.jumlah_transaksi}</span>,
    },
    {
      id: "belanja",
      header: "Total Belanja",
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{rupiah(row.original.total_belanja)}</span>
      ),
    },
    {
      id: "terakhir",
      header: "Terakhir Belanja",
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {row.original.terakhir_belanja
            ? tanggalJakarta(row.original.terakhir_belanja)
            : "—"}
        </span>
      ),
    },
    {
      id: "aksi",
      header: "Aksi",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Link
            href={`/dashboard/pelanggan/${row.original.id}`}
            className="inline-flex h-8 items-center rounded-md border border-dash-border px-2.5 text-[11.5px] hover:bg-dash-bg-alt"
          >
            Detail
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[11.5px]"
            onClick={() => setForm({ terbuka: true, pelanggan: row.original })}
          >
            Ubah
          </Button>
        </div>
      ),
    },
  ];

  const kosong = q
    ? "Tidak ada pelanggan yang cocok dengan pencarian."
    : "Belum ada pelanggan. Tambahkan pelanggan pertama.";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Pelanggan</h1>
          <p className="mt-1 text-[12px] text-dash-text-muted">
            Kelola data pelanggan dan lihat riwayat pembelian.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setForm({ terbuka: true, pelanggan: null })}
        >
          Tambah pelanggan
        </Button>
      </header>

      {ringkasan && (
        <section aria-label="Ringkasan pelanggan" className="space-y-2">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KartuStatistik
              label="Total pelanggan"
              nilai={String(ringkasan.total_pelanggan)}
            />
            <KartuStatistik
              label="Pelanggan dengan transaksi"
              nilai={String(ringkasan.pelanggan_dengan_transaksi)}
            />
            <KartuStatistik
              label="Total transaksi"
              nilai={String(ringkasan.total_transaksi)}
            />
            <KartuStatistik
              label="Total nilai transaksi"
              nilai={rupiah(ringkasan.total_nilai_transaksi)}
            />
          </div>
          <p className="text-[11px] text-dash-text-muted">
            Transaksi dihitung dari pesanan berstatus dibayar sampai selesai.
          </p>
        </section>
      )}
      {galatRingkasan && <ErrorState pesan={galatRingkasan} />}

      <section className="panel-dasbor" aria-labelledby="judul-pelanggan">
        <h2 id="judul-pelanggan" className="font-sans text-[13px] font-semibold">
          Daftar pelanggan
        </h2>
        <Input
          type="search"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari nama, nomor telepon, atau email pelanggan..."
          aria-label="Cari pelanggan"
          className="mb-3 mt-3 max-w-md"
        />
        {memuat ? (
          <MemuatTabel />
        ) : galat ? (
          <ErrorState pesan={galat} />
        ) : data ? (
          <DataTable
            kolom={kolom}
            data={data.results}
            total={data.count}
            halaman={halaman}
            perHalaman={PER_HALAMAN}
            onHalaman={setHalaman}
            kosong={kosong}
            onSortir={(s) => {
              setSortir(s);
              setHalaman(1);
            }}
          />
        ) : (
          <EmptyState pesan={kosong} />
        )}
      </section>

      {form.terbuka && (
        <FormPelanggan
          key={form.pelanggan?.id ?? "baru"}
          pelanggan={form.pelanggan}
          onTutup={() => setForm({ terbuka: false, pelanggan: null })}
          onBerhasil={async (pesan) => {
            toast.success(pesan);
            setForm({ terbuka: false, pelanggan: null });
            await muat();
            await muatRingkasan();
          }}
        />
      )}
    </div>
  );
}
