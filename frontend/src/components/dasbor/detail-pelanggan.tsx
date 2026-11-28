"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { ApiError, api, pesanAksi } from "@/lib/api";
import { rupiah, tanggalJakarta, waktuJakarta } from "@/lib/format";
import { Button } from "@/components/ui/button";
import type {
  HalamanRiwayatPesanan,
  PelangganDetail,
  RiwayatPesananPelanggan,
} from "@/types/skema";

import { DataTable } from "./data-table";
import { FormPelanggan } from "./form-pelanggan";
import { EmptyState, ErrorState, Memuat } from "./keadaan";

// Sama dengan PelangganPagination.page_size di backend.
const PER_HALAMAN = 25;
const STATUS_BERHASIL = ["dibayar", "diproses", "dikirim", "selesai"];

function Rincian({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-dash-text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 whitespace-pre-line text-[12.5px]">{nilai || "—"}</dd>
    </div>
  );
}

function KartuStatistik({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="panel-dasbor">
      <p className="text-[11px] uppercase tracking-wide text-dash-text-muted">{label}</p>
      <p className="mt-1 break-words font-serif text-[22px] leading-tight">{nilai}</p>
    </div>
  );
}

const KOLOM_RIWAYAT: ColumnDef<RiwayatPesananPelanggan, unknown>[] = [
  {
    id: "invoice",
    header: "Invoice",
    cell: ({ row }) => <span className="whitespace-nowrap">{row.original.nomor}</span>,
  },
  {
    id: "tanggal",
    header: "Tanggal",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{tanggalJakarta(row.original.dibuat)}</span>
    ),
  },
  {
    id: "produk",
    header: "Produk",
    cell: ({ row }) => (
      <span className="block max-w-[260px] truncate" title={row.original.produk.join(", ")}>
        {row.original.produk.length ? row.original.produk.join(", ") : "—"}
      </span>
    ),
  },
  {
    id: "jumlah_item",
    header: "Jumlah Item",
    cell: ({ row }) => <span className="whitespace-nowrap">{row.original.jumlah_item}</span>,
  },
  {
    id: "total",
    header: "Total",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{rupiah(row.original.total)}</span>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <span
        className={`lencana ${
          STATUS_BERHASIL.includes(row.original.status ?? "")
            ? "lencana-utama"
            : "lencana-redup"
        }`}
      >
        {row.original.status_label}
      </span>
    ),
  },
  { id: "metode", header: "Pembayaran", cell: ({ row }) => row.original.metode_label },
];

/** Detail pelanggan + riwayat pembelian dari pesanan asli (bukan ringkasan tersimpan). */
export function DetailPelanggan({ id }: { id: string }) {
  const [pelanggan, setPelanggan] = useState<PelangganDetail | null>(null);
  const [riwayat, setRiwayat] = useState<HalamanRiwayatPesanan | null>(null);
  const [halaman, setHalaman] = useState(1);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");
  const [galatRiwayat, setGalatRiwayat] = useState("");
  const [formTerbuka, setFormTerbuka] = useState(false);

  const muat = useCallback(async () => {
    setGalat("");
    try {
      setPelanggan(await api<PelangganDetail>(`/pelanggan/${id}/`));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setGalat("Pelanggan tidak ditemukan.");
        return;
      }
      setGalat(pesanAksi(err) || "Gagal memuat detail pelanggan.");
    } finally {
      setMemuat(false);
    }
  }, [id]);

  const muatRiwayat = useCallback(async () => {
    try {
      setRiwayat(
        await api<HalamanRiwayatPesanan>(
          `/pelanggan/${id}/pesanan/?page=${halaman}`,
        ),
      );
      setGalatRiwayat("");
    } catch (err) {
      // Riwayat gagal dimuat tidak menghapus profil yang sudah tampil.
      setGalatRiwayat(pesanAksi(err) || "Gagal memuat riwayat pembelian.");
    }
  }, [id, halaman]);

  useEffect(() => {
    void muat();
  }, [muat]);

  useEffect(() => {
    void muatRiwayat();
  }, [muatRiwayat]);

  if (memuat) return <Memuat pesan="Memuat detail pelanggan..." />;
  if (galat || !pelanggan) {
    return (
      <div className="space-y-4">
        <ErrorState pesan={galat || "Pelanggan tidak ditemukan."} />
        <Link href="/dashboard/pelanggan" className="tombol-sekunder h-8 px-3 text-[11.5px]">
          Kembali ke pelanggan
        </Link>
      </div>
    );
  }

  const { statistik } = pelanggan;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/dashboard/pelanggan"
            className="text-[11.5px] text-dash-text-muted hover:text-dash-primary"
          >
            ← Pelanggan
          </Link>
          <h1 className="mt-1 text-2xl">{pelanggan.nama}</h1>
          <p className="mt-1 text-[12px] text-dash-text-muted">
            Terdaftar {tanggalJakarta(pelanggan.dibuat)} · diperbarui{" "}
            {waktuJakarta(pelanggan.diperbarui)}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => setFormTerbuka(true)}>
          Ubah pelanggan
        </Button>
      </header>

      <section className="panel-dasbor" aria-labelledby="profil-pelanggan">
        <h2 id="profil-pelanggan" className="font-sans text-[13px] font-semibold">
          Profil
        </h2>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2">
          <Rincian label="Nomor telepon" nilai={pelanggan.telepon ?? ""} />
          <Rincian label="Email" nilai={pelanggan.email ?? ""} />
          <Rincian label="Alamat" nilai={pelanggan.alamat ?? ""} />
          <Rincian label="Catatan" nilai={pelanggan.catatan ?? ""} />
        </dl>
      </section>

      <section aria-label="Statistik pelanggan" className="space-y-2">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KartuStatistik
            label="Total transaksi"
            nilai={String(statistik.jumlah_transaksi)}
          />
          <KartuStatistik
            label="Total belanja"
            nilai={rupiah(statistik.total_belanja)}
          />
          <KartuStatistik
            label="Rata-rata transaksi"
            nilai={rupiah(statistik.rata_rata_transaksi)}
          />
          <KartuStatistik
            label="Transaksi selesai"
            nilai={String(statistik.transaksi_selesai)}
          />
        </div>
        <p className="text-[11px] text-dash-text-muted">
          Statistik hanya menghitung pesanan yang sudah dibayar sampai selesai.
          {statistik.terakhir_belanja &&
            ` Pembelian terakhir ${tanggalJakarta(statistik.terakhir_belanja)}.`}
        </p>
      </section>

      <section className="panel-dasbor" aria-labelledby="riwayat-pembelian">
        <h2 id="riwayat-pembelian" className="font-sans text-[13px] font-semibold">
          Riwayat pembelian
        </h2>
        {riwayat === null ? (
          galatRiwayat ? (
            <ErrorState pesan={galatRiwayat} />
          ) : (
            <Memuat pesan="Memuat riwayat..." />
          )
        ) : riwayat.count === 0 ? (
          <EmptyState pesan="Pelanggan ini belum memiliki riwayat pembelian." />
        ) : (
          <div className="mt-3">
            <DataTable
              kolom={KOLOM_RIWAYAT}
              data={riwayat.results}
              total={riwayat.count}
              halaman={halaman}
              perHalaman={PER_HALAMAN}
              onHalaman={setHalaman}
              kosong="Pelanggan ini belum memiliki riwayat pembelian."
            />
          </div>
        )}
      </section>

      {formTerbuka && (
        <FormPelanggan
          pelanggan={pelanggan}
          onTutup={() => setFormTerbuka(false)}
          onBerhasil={async (pesan) => {
            toast.success(pesan);
            setFormTerbuka(false);
            await muat();
          }}
        />
      )}
    </div>
  );
}
