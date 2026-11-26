"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { api, pesanAksi } from "@/lib/api";
import { rupiah } from "@/lib/format";
import { saringProduk } from "@/lib/saring-dasbor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { KategoriAdmin, MotifAdmin, ProdukAdmin } from "@/types/skema";

import { DataTable } from "./data-table";
import { DialogKonfirmasi } from "./dialog-konfirmasi";
import { DialogKategoriMotif } from "./dialog-kategori-motif";
import { FormProduk } from "./form-produk";
import { EmptyState, ErrorState, Memuat } from "./keadaan";

const LABEL_KOLOM = "mb-1.5 block text-[11px] text-dash-text-muted";
const FILTER_AWAL = { q: "", kategori: "", motif: "", aktif: "" };
// Endpoint kelola mengembalikan seluruh produk (tanpa paginasi); filter di klien.
// shortcut: katalog besar bisa lambat, pindahkan ke filter server saat API mendukung.
const PER_HALAMAN = 1000;

export function KelolaProduk() {
  const [daftar, setDaftar] = useState<ProdukAdmin[] | null>(null);
  const [kategori, setKategori] = useState<KategoriAdmin[]>([]);
  const [motif, setMotif] = useState<MotifAdmin[]>([]);
  const [galat, setGalat] = useState("");
  const [filter, setFilter] = useState(FILTER_AWAL);
  const [halaman, setHalaman] = useState(1);
  const [form, setForm] = useState<{ terbuka: boolean; produk: ProdukAdmin | null }>({
    terbuka: false,
    produk: null,
  });
  const [dialogKategori, setDialogKategori] = useState(false);
  const [dialogStatus, setDialogStatus] = useState<ProdukAdmin | null>(null);
  const [proses, setProses] = useState(false);
  const [galatDialog, setGalatDialog] = useState("");
  const [pesan, setPesan] = useState("");

  const muat = useCallback(async () => {
    try {
      const [produk, semuaKategori, semuaMotif] = await Promise.all([
        api<ProdukAdmin[]>("/katalog/kelola/produk/"),
        api<KategoriAdmin[]>("/katalog/kelola/kategori/"),
        api<MotifAdmin[]>("/katalog/kelola/motif/"),
      ]);
      setDaftar(produk);
      setKategori(semuaKategori);
      setMotif(semuaMotif);
      setGalat("");
    } catch (err) {
      setGalat(pesanAksi(err) || "Gagal memuat produk.");
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  const namaKategori = useMemo(() => new Map(kategori.map((k) => [k.id, k.nama])), [kategori]);
  const namaMotif = useMemo(() => new Map(motif.map((m) => [m.slug, m.nama])), [motif]);
  const hasil = useMemo(() => saringProduk(daftar ?? [], filter), [daftar, filter]);

  function ubahFilter(nilai: Partial<typeof FILTER_AWAL>) {
    setFilter((f) => ({ ...f, ...nilai }));
    setHalaman(1);
  }

  async function ubahStatus() {
    if (!dialogStatus) return;
    setProses(true);
    setGalatDialog("");
    try {
      await api(`/katalog/kelola/produk/${dialogStatus.id}/`, {
        method: "PATCH",
        body: { aktif: !dialogStatus.aktif },
      });
      setPesan(`${dialogStatus.nama} ${dialogStatus.aktif ? "dinonaktifkan" : "diaktifkan"}.`);
      setDialogStatus(null);
      await muat();
    } catch (err) {
      setGalatDialog(pesanAksi(err));
    } finally {
      setProses(false);
    }
  }

  const kolom: ColumnDef<ProdukAdmin, unknown>[] = [
    {
      id: "nama",
      header: "Produk",
      cell: ({ row }) => (
        <>
          {row.original.nama}
          <span className="block text-[10.5px] text-dash-text-muted">{row.original.slug}</span>
        </>
      ),
    },
    {
      id: "kategori",
      header: "Kategori",
      cell: ({ row }) => namaKategori.get(row.original.kategori) ?? `#${row.original.kategori}`,
    },
    {
      id: "motif",
      header: "Motif",
      cell: ({ row }) => namaMotif.get(row.original.motif) ?? row.original.motif,
    },
    { id: "harga", header: "Harga", cell: ({ row }) => rupiah(row.original.harga) },
    {
      id: "varian",
      header: "Varian",
      cell: ({ row }) => (
        <>
          {row.original.varian.length}
          <span className="block text-[10.5px] text-dash-text-muted">
            {row.original.foto.length} foto
          </span>
        </>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={`lencana ${row.original.aktif ? "lencana-utama" : "lencana-redup"}`}>
          {row.original.aktif ? "Terbit" : "Nonaktif"}
        </span>
      ),
    },
    {
      id: "aksi",
      header: "Aksi",
      cell: ({ row }) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[11.5px]"
            onClick={() => setForm({ terbuka: true, produk: row.original })}
          >
            Ubah
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[11.5px]"
            onClick={() => {
              setGalatDialog("");
              setDialogStatus(row.original);
            }}
          >
            {row.original.aktif ? "Nonaktifkan" : "Aktifkan"}
          </Button>
          <Link
            href={`/dashboard/label?produk=${row.original.id}`}
            className="inline-flex h-8 items-center rounded-md border border-dash-border px-2.5 text-[11.5px] hover:bg-dash-bg-alt"
          >
            Lihat QR
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Produk</h1>
          <p className="mt-1 text-[12px] text-dash-text-muted">
            Kelola katalog, varian, foto, kategori, dan motif. Produk tidak dihapus permanen.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setDialogKategori(true)}>
            Kelola kategori & motif
          </Button>
          <Button type="button" onClick={() => setForm({ terbuka: true, produk: null })}>
            Tambah produk
          </Button>
        </div>
      </header>

      {pesan && <p role="status" className="text-[11px] text-dash-text-muted">{pesan}</p>}

      <section className="panel-dasbor" aria-label="Filter produk">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="produk-q" className={LABEL_KOLOM}>Cari</Label>
            <Input
              id="produk-q"
              type="search"
              placeholder="Nama produk"
              value={filter.q}
              onChange={(e) => ubahFilter({ q: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="produk-kategori" className={LABEL_KOLOM}>Kategori</Label>
            <select
              id="produk-kategori"
              className="input-dasbor"
              value={filter.kategori}
              onChange={(e) => ubahFilter({ kategori: e.target.value })}
            >
              <option value="">Semua kategori</option>
              {kategori.map((k) => (
                <option key={k.id} value={String(k.id)}>{k.nama}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="produk-motif" className={LABEL_KOLOM}>Motif</Label>
            <select
              id="produk-motif"
              className="input-dasbor"
              value={filter.motif}
              onChange={(e) => ubahFilter({ motif: e.target.value })}
            >
              <option value="">Semua motif</option>
              {motif.map((m) => (
                <option key={m.id} value={m.slug}>{m.nama}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="produk-status" className={LABEL_KOLOM}>Status terbit</Label>
            <select
              id="produk-status"
              className="input-dasbor"
              value={filter.aktif}
              onChange={(e) => ubahFilter({ aktif: e.target.value })}
            >
              <option value="">Semua status</option>
              <option value="true">Terbit</option>
              <option value="false">Nonaktif</option>
            </select>
          </div>
        </div>
      </section>

      <section className="panel-dasbor" aria-labelledby="judul-produk">
        <h2 id="judul-produk" className="font-sans text-[13px] font-semibold">Daftar produk</h2>
        {daftar === null ? (
          galat ? <ErrorState pesan={galat} /> : <Memuat />
        ) : daftar.length === 0 ? (
          <EmptyState pesan="Belum ada produk." />
        ) : hasil.length === 0 ? (
          <EmptyState pesan="Tidak ada produk yang cocok dengan filter." />
        ) : (
          <div className="mt-3">
            <DataTable
              kolom={kolom}
              data={hasil}
              total={hasil.length}
              halaman={halaman}
              perHalaman={PER_HALAMAN}
              onHalaman={setHalaman}
              kosong="Tidak ada produk yang cocok dengan filter."
            />
          </div>
        )}
      </section>

      {form.terbuka && (
        <FormProduk
          produk={form.produk}
          kategori={kategori}
          motif={motif}
          onTutup={() => setForm({ terbuka: false, produk: null })}
          onBerhasil={async (teks) => {
            setPesan(teks);
            setForm({ terbuka: false, produk: null });
            await muat();
          }}
        />
      )}

      <DialogKategoriMotif
        terbuka={dialogKategori}
        kategori={kategori}
        motif={motif}
        onTutup={() => setDialogKategori(false)}
        onBerubah={muat}
      />

      <DialogKonfirmasi
        terbuka={dialogStatus !== null}
        judul="Ubah status produk"
        labelKonfirmasi={dialogStatus?.aktif ? "Nonaktifkan" : "Aktifkan"}
        proses={proses}
        onBatal={() => setDialogStatus(null)}
        onKonfirmasi={ubahStatus}
      >
        <p>
          Produk <b>{dialogStatus?.nama}</b> akan {dialogStatus?.aktif ? "disembunyikan dari katalog" : "ditampilkan di katalog"}.
          Riwayat transaksi tetap tersimpan.
        </p>
        {galatDialog && <ErrorState pesan={galatDialog} />}
      </DialogKonfirmasi>
    </div>
  );
}
