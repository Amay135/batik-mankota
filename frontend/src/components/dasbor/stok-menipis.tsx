"use client";

import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { api, pesanAksi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HalamanStok, KategoriAdmin, Stok } from "@/types/skema";

import { DataTable } from "./data-table";
import { DialogKonfirmasi } from "./dialog-konfirmasi";
import { EmptyState, ErrorState, Memuat } from "./keadaan";

const LABEL_KOLOM = "mb-1.5 block text-[11px] text-dash-text-muted";
const FILTER_AWAL = { q: "", kategori: "", ukuran: "", warna: "" };
// Sama dengan StokPagination.page_size di backend.
const PER_HALAMAN = 50;

export function StokMenipis() {
  const [baris, setBaris] = useState<Stok[]>([]);
  const [total, setTotal] = useState(0);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");
  const [filter, setFilter] = useState(FILTER_AWAL);
  const [halaman, setHalaman] = useState(1);
  const [kategori, setKategori] = useState<KategoriAdmin[]>([]);
  const [dialog, setDialog] = useState<Stok | null>(null);
  const [minimum, setMinimum] = useState("0");
  const [alasan, setAlasan] = useState("");
  const [proses, setProses] = useState(false);
  const [galatDialog, setGalatDialog] = useState("");
  const [pesan, setPesan] = useState("");

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat("");
    try {
      const q = new URLSearchParams({ page: String(halaman) });
      if (filter.q) q.set("q", filter.q);
      if (filter.kategori) q.set("kategori", filter.kategori);
      if (filter.ukuran) q.set("ukuran", filter.ukuran);
      if (filter.warna) q.set("warna", filter.warna);
      const data = await api<HalamanStok>(`/stok/menipis/?${q}`);
      setBaris(data.results);
      setTotal(data.count);
    } catch (err) {
      setGalat(pesanAksi(err) || "Gagal memuat stok menipis.");
    } finally {
      setMemuat(false);
    }
  }, [filter, halaman]);

  useEffect(() => {
    void muat();
  }, [muat]);

  useEffect(() => {
    api<KategoriAdmin[]>("/katalog/kelola/kategori/")
      .then(setKategori)
      .catch(() => setKategori([]));
  }, []);

  function ubahFilter(nilai: Partial<typeof FILTER_AWAL>) {
    setFilter((f) => ({ ...f, ...nilai }));
    setHalaman(1);
  }

  function bukaDialog(s: Stok) {
    setDialog(s);
    setMinimum(String(s.stok_minimum));
    setAlasan("");
    setGalatDialog("");
  }

  async function simpanMinimum() {
    if (!dialog) return;
    setProses(true);
    setGalatDialog("");
    try {
      await api(`/stok/${dialog.varian}/minimum/`, {
        method: "PATCH",
        body: { min_stock: Number(minimum), alasan },
      });
      setPesan(`Stok minimum ${dialog.sku} diubah menjadi ${minimum}.`);
      setDialog(null);
      await muat();
    } catch (err) {
      setGalatDialog(pesanAksi(err));
    } finally {
      setProses(false);
    }
  }

  const kolom: ColumnDef<Stok, unknown>[] = [
    { id: "produk", header: "Produk", cell: ({ row }) => row.original.produk },
    { id: "sku", header: "SKU", cell: ({ row }) => row.original.sku },
    { id: "ukuran", header: "Ukuran", cell: ({ row }) => row.original.ukuran },
    { id: "warna", header: "Warna", cell: ({ row }) => row.original.warna },
    { id: "tersedia", header: "Tersedia", cell: ({ row }) => row.original.stok_tersedia },
    { id: "minimum", header: "Minimum", cell: ({ row }) => row.original.stok_minimum },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <span className="lencana lencana-redup">{row.original.status_stok}</span>,
    },
    {
      id: "aksi",
      header: "Aksi",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[11.5px]"
            onClick={() => bukaDialog(row.original)}
          >
            Atur minimum
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="panel-dasbor" aria-label="Filter stok menipis">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="menipis-q" className={LABEL_KOLOM}>Cari</Label>
            <Input
              id="menipis-q"
              type="search"
              placeholder="Nama produk atau SKU"
              value={filter.q}
              onChange={(e) => ubahFilter({ q: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="menipis-kategori" className={LABEL_KOLOM}>Kategori</Label>
            <select
              id="menipis-kategori"
              className="input-dasbor"
              value={filter.kategori}
              onChange={(e) => ubahFilter({ kategori: e.target.value })}
            >
              <option value="">Semua kategori</option>
              {kategori.map((k) => (
                <option key={k.id} value={k.slug}>{k.nama}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="menipis-ukuran" className={LABEL_KOLOM}>Ukuran</Label>
            <select
              id="menipis-ukuran"
              className="input-dasbor"
              value={filter.ukuran}
              onChange={(e) => ubahFilter({ ukuran: e.target.value })}
            >
              <option value="">Semua ukuran</option>
              {["S", "M", "L", "XL", "XXL", "ALL"].map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="menipis-warna" className={LABEL_KOLOM}>Warna</Label>
            <select
              id="menipis-warna"
              className="input-dasbor"
              value={filter.warna}
              onChange={(e) => ubahFilter({ warna: e.target.value })}
            >
              <option value="">Semua warna</option>
              {["indigo", "soga", "krem", "hitam"].map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="panel-dasbor" aria-labelledby="judul-menipis">
        <h2 id="judul-menipis" className="font-sans text-[13px] font-semibold">Daftar stok menipis</h2>
        {pesan && <p role="status" className="mt-2 text-[11px] text-dash-text-muted">{pesan}</p>}
        {memuat ? (
          <Memuat />
        ) : galat ? (
          <ErrorState pesan={galat} />
        ) : total === 0 ? (
          <EmptyState pesan="Tidak ada stok yang menipis." />
        ) : (
          <div className="mt-3">
            <DataTable
              kolom={kolom}
              data={baris}
              total={total}
              halaman={halaman}
              perHalaman={PER_HALAMAN}
              onHalaman={setHalaman}
              kosong="Tidak ada stok yang menipis."
            />
          </div>
        )}
      </section>

      <DialogKonfirmasi
        terbuka={dialog !== null}
        judul="Atur stok minimum"
        labelKonfirmasi="Simpan"
        proses={proses}
        onBatal={() => setDialog(null)}
        onKonfirmasi={simpanMinimum}
      >
        <div className="space-y-3">
          <p>
            Varian <b>{dialog?.sku}</b> ({dialog?.produk}, {dialog?.ukuran} {dialog?.warna}).
          </p>
          <div>
            <Label htmlFor="minimum-baru" className={LABEL_KOLOM}>Stok minimum</Label>
            <Input
              id="minimum-baru"
              type="number"
              min={0}
              value={minimum}
              onChange={(e) => setMinimum(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="minimum-alasan" className={LABEL_KOLOM}>Alasan</Label>
            <Input
              id="minimum-alasan"
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              required
            />
          </div>
          {galatDialog && <ErrorState pesan={galatDialog} />}
        </div>
      </DialogKonfirmasi>
    </div>
  );
}
