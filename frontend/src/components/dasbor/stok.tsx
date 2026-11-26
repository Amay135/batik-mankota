"use client";

import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { api, pesanAksi } from "@/lib/api";
import { waktuJakarta } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import type { HalamanMutasi, HalamanStok, KategoriAdmin, Mutasi, Stok } from "@/types/skema";

import { DataTable } from "./data-table";
import { DialogKonfirmasi } from "./dialog-konfirmasi";
import { EmptyState, ErrorState, Memuat } from "./keadaan";

const LABEL_KOLOM = "mb-1.5 block text-[11px] text-dash-text-muted";
const FILTER_STOK = { q: "", kategori: "", ukuran: "", warna: "" };
const FILTER_MUTASI = { varian_id: "", tipe: "", dari: "", sampai: "" };
const TIPE = [
  ["PURCHASE_IN", "Pembelian masuk"],
  ["POS_OUT", "Penjualan kasir"],
  ["ONLINE_OUT", "Penjualan online"],
  ["RETURN_IN", "Retur masuk"],
  ["ADJUST", "Penyesuaian"],
  ["OPNAME", "Stok opname"],
] as const;
// Sama dengan StokPagination.page_size di backend.
const PER_HALAMAN = 50;

/** Tab "stok" dan "mutasi" dikendalikan halaman Inventaris agar satu tingkat tab saja. */
export function StokDasbor({ tab, onTabChange }: { tab: string; onTabChange: (nilai: string) => void }) {
  const [kategori, setKategori] = useState<KategoriAdmin[]>([]);

  // Stok
  const [stok, setStok] = useState<Stok[]>([]);
  const [totalStok, setTotalStok] = useState(0);
  const [halamanStok, setHalamanStok] = useState(1);
  const [filterStok, setFilterStok] = useState(FILTER_STOK);
  const [memuatStok, setMemuatStok] = useState(true);
  const [galatStok, setGalatStok] = useState("");

  // Mutasi
  const [mutasi, setMutasi] = useState<Mutasi[]>([]);
  const [totalMutasi, setTotalMutasi] = useState(0);
  const [halamanMutasi, setHalamanMutasi] = useState(1);
  const [filterMutasi, setFilterMutasi] = useState(FILTER_MUTASI);
  const [memuatMutasi, setMemuatMutasi] = useState(false);
  const [galatMutasi, setGalatMutasi] = useState("");

  // Penyesuaian
  const [dialog, setDialog] = useState<Stok | null>(null);
  const [delta, setDelta] = useState("");
  const [proses, setProses] = useState(false);
  const [galatDialog, setGalatDialog] = useState("");
  const [pesan, setPesan] = useState("");

  const muatStok = useCallback(async () => {
    setMemuatStok(true);
    setGalatStok("");
    try {
      const q = new URLSearchParams({ page: String(halamanStok) });
      if (filterStok.q) q.set("q", filterStok.q);
      if (filterStok.kategori) q.set("kategori", filterStok.kategori);
      if (filterStok.ukuran) q.set("ukuran", filterStok.ukuran);
      if (filterStok.warna) q.set("warna", filterStok.warna);
      const data = await api<HalamanStok>(`/stok/?${q}`);
      setStok(data.results);
      setTotalStok(data.count);
    } catch (err) {
      setGalatStok(pesanAksi(err) || "Gagal memuat stok.");
    } finally {
      setMemuatStok(false);
    }
  }, [filterStok, halamanStok]);

  const muatMutasi = useCallback(async () => {
    setMemuatMutasi(true);
    setGalatMutasi("");
    try {
      const q = new URLSearchParams({ page: String(halamanMutasi) });
      if (filterMutasi.varian_id) q.set("varian_id", filterMutasi.varian_id);
      if (filterMutasi.tipe) q.set("tipe", filterMutasi.tipe);
      if (filterMutasi.dari) q.set("dari", filterMutasi.dari);
      if (filterMutasi.sampai) q.set("sampai", filterMutasi.sampai);
      const data = await api<HalamanMutasi>(`/stok/mutasi/?${q}`);
      setMutasi(data.results);
      setTotalMutasi(data.count);
    } catch (err) {
      setGalatMutasi(pesanAksi(err) || "Gagal memuat riwayat mutasi.");
    } finally {
      setMemuatMutasi(false);
    }
  }, [filterMutasi, halamanMutasi]);

  useEffect(() => {
    void muatStok();
  }, [muatStok]);

  useEffect(() => {
    if (tab === "mutasi") void muatMutasi();
  }, [tab, muatMutasi]);

  useEffect(() => {
    api<KategoriAdmin[]>("/katalog/kelola/kategori/")
      .then(setKategori)
      .catch(() => setKategori([]));
  }, []);

  function ubahFilterStok(nilai: Partial<typeof FILTER_STOK>) {
    setFilterStok((f) => ({ ...f, ...nilai }));
    setHalamanStok(1);
  }

  function ubahFilterMutasi(nilai: Partial<typeof FILTER_MUTASI>) {
    setFilterMutasi((f) => ({ ...f, ...nilai }));
    setHalamanMutasi(1);
  }

  function lihatRiwayat(s: Stok) {
    setFilterMutasi({ ...FILTER_MUTASI, varian_id: String(s.varian) });
    setHalamanMutasi(1);
    onTabChange("mutasi");
  }

  function bukaPenyesuaian(s: Stok) {
    setDialog(s);
    setDelta("");
    setGalatDialog("");
  }

  async function simpanPenyesuaian(alasan?: string) {
    if (!dialog) return;
    setProses(true);
    setGalatDialog("");
    try {
      await api("/stok/penyesuaian/", {
        method: "POST",
        body: { varian_id: dialog.varian, qty_delta: Number(delta), alasan },
      });
      setPesan(`Stok ${dialog.sku} disesuaikan sebanyak ${delta}.`);
      setDialog(null);
      await Promise.all([muatStok(), tab === "mutasi" ? muatMutasi() : Promise.resolve()]);
    } catch (err) {
      setGalatDialog(pesanAksi(err));
    } finally {
      setProses(false);
    }
  }

  const kolomStok: ColumnDef<Stok, unknown>[] = [
    { id: "produk", header: "Produk", cell: ({ row }) => row.original.produk },
    { id: "sku", header: "SKU", cell: ({ row }) => row.original.sku },
    { id: "ukuran", header: "Ukuran", cell: ({ row }) => row.original.ukuran },
    { id: "warna", header: "Warna", cell: ({ row }) => row.original.warna },
    { id: "tersedia", header: "Tersedia", cell: ({ row }) => row.original.stok_tersedia },
    { id: "terpesan", header: "Dipesan", cell: ({ row }) => row.original.stok_terpesan },
    { id: "fisik", header: "Fisik", cell: ({ row }) => row.original.stok_fisik },
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
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[11.5px]"
            onClick={() => lihatRiwayat(row.original)}
          >
            Riwayat
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[11.5px]"
            onClick={() => bukaPenyesuaian(row.original)}
          >
            Sesuaikan
          </Button>
        </div>
      ),
    },
  ];

  const kolomMutasi: ColumnDef<Mutasi, unknown>[] = [
    {
      id: "waktu",
      header: "Waktu (WIB)",
      cell: ({ row }) => <span className="whitespace-nowrap">{waktuJakarta(row.original.dibuat)}</span>,
    },
    { id: "sku", header: "SKU", cell: ({ row }) => row.original.sku },
    { id: "tipe", header: "Tipe", cell: ({ row }) => row.original.tipe_label },
    {
      id: "delta",
      header: "Perubahan",
      cell: ({ row }) => (
        <span className={row.original.qty_delta < 0 ? "text-dash-text-muted" : ""}>
          {row.original.qty_delta > 0 ? `+${row.original.qty_delta}` : row.original.qty_delta}
        </span>
      ),
    },
    {
      id: "ref",
      header: "Referensi",
      cell: ({ row }) =>
        row.original.ref_type ? `${row.original.ref_type}${row.original.ref_id ? ` #${row.original.ref_id}` : ""}` : "—",
    },
    { id: "pelaku", header: "Pelaku", cell: ({ row }) => row.original.pelaku ?? "—" },
    { id: "catatan", header: "Catatan", cell: ({ row }) => row.original.catatan || "—" },
  ];

  return (
    <>
      <TabsContent value="stok">
          <section className="panel-dasbor" aria-label="Filter stok">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="stok-q" className={LABEL_KOLOM}>Cari</Label>
                <Input
                  id="stok-q"
                  type="search"
                  placeholder="Nama produk atau SKU"
                  value={filterStok.q}
                  onChange={(e) => ubahFilterStok({ q: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="stok-kategori" className={LABEL_KOLOM}>Kategori</Label>
                <select
                  id="stok-kategori"
                  className="input-dasbor"
                  value={filterStok.kategori}
                  onChange={(e) => ubahFilterStok({ kategori: e.target.value })}
                >
                  <option value="">Semua kategori</option>
                  {kategori.map((k) => (
                    <option key={k.id} value={k.slug}>{k.nama}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="stok-ukuran" className={LABEL_KOLOM}>Ukuran</Label>
                <select
                  id="stok-ukuran"
                  className="input-dasbor"
                  value={filterStok.ukuran}
                  onChange={(e) => ubahFilterStok({ ukuran: e.target.value })}
                >
                  <option value="">Semua ukuran</option>
                  {["S", "M", "L", "XL", "XXL", "ALL"].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="stok-warna" className={LABEL_KOLOM}>Warna</Label>
                <select
                  id="stok-warna"
                  className="input-dasbor"
                  value={filterStok.warna}
                  onChange={(e) => ubahFilterStok({ warna: e.target.value })}
                >
                  <option value="">Semua warna</option>
                  {["indigo", "soga", "krem", "hitam"].map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="panel-dasbor mt-4" aria-labelledby="judul-stok">
            <h2 id="judul-stok" className="font-sans text-[13px] font-semibold">Stok per varian</h2>
            {pesan && <p role="status" className="mt-2 text-[11px] text-dash-text-muted">{pesan}</p>}
            {memuatStok ? (
              <Memuat />
            ) : galatStok ? (
              <ErrorState pesan={galatStok} />
            ) : totalStok === 0 ? (
              <EmptyState pesan="Tidak ada stok yang cocok dengan filter." />
            ) : (
              <div className="mt-3">
                <DataTable
                  kolom={kolomStok}
                  data={stok}
                  total={totalStok}
                  halaman={halamanStok}
                  perHalaman={PER_HALAMAN}
                  onHalaman={setHalamanStok}
                  kosong="Tidak ada stok yang cocok dengan filter."
                />
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="mutasi">
          <section className="panel-dasbor" aria-label="Filter riwayat mutasi">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="mutasi-varian" className={LABEL_KOLOM}>Varian ID</Label>
                <Input
                  id="mutasi-varian"
                  inputMode="numeric"
                  placeholder="Semua varian"
                  value={filterMutasi.varian_id}
                  onChange={(e) => ubahFilterMutasi({ varian_id: e.target.value.replace(/\D/g, "") })}
                />
              </div>
              <div>
                <Label htmlFor="mutasi-tipe" className={LABEL_KOLOM}>Tipe</Label>
                <select
                  id="mutasi-tipe"
                  className="input-dasbor"
                  value={filterMutasi.tipe}
                  onChange={(e) => ubahFilterMutasi({ tipe: e.target.value })}
                >
                  <option value="">Semua tipe</option>
                  {TIPE.map(([nilai, label]) => (
                    <option key={nilai} value={nilai}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="mutasi-dari" className={LABEL_KOLOM}>Dari tanggal</Label>
                <Input
                  id="mutasi-dari"
                  type="date"
                  value={filterMutasi.dari}
                  onChange={(e) => ubahFilterMutasi({ dari: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="mutasi-sampai" className={LABEL_KOLOM}>Sampai tanggal</Label>
                <Input
                  id="mutasi-sampai"
                  type="date"
                  value={filterMutasi.sampai}
                  onChange={(e) => ubahFilterMutasi({ sampai: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="panel-dasbor mt-4" aria-labelledby="judul-mutasi">
            <div className="flex items-center justify-between">
              <h2 id="judul-mutasi" className="font-sans text-[13px] font-semibold">Riwayat pergerakan stok</h2>
              {filterMutasi.varian_id && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-[11.5px]"
                  onClick={() => ubahFilterMutasi({ varian_id: "" })}
                >
                  Tampilkan semua varian
                </Button>
              )}
            </div>
            {memuatMutasi ? (
              <Memuat />
            ) : galatMutasi ? (
              <ErrorState pesan={galatMutasi} />
            ) : totalMutasi === 0 ? (
              <EmptyState pesan="Tidak ada mutasi yang cocok dengan filter." />
            ) : (
              <div className="mt-3">
                <DataTable
                  kolom={kolomMutasi}
                  data={mutasi}
                  total={totalMutasi}
                  halaman={halamanMutasi}
                  perHalaman={PER_HALAMAN}
                  onHalaman={setHalamanMutasi}
                  kosong="Tidak ada mutasi yang cocok dengan filter."
                />
              </div>
            )}
          </section>
      </TabsContent>

      <DialogKonfirmasi
        terbuka={dialog !== null}
        judul="Penyesuaian stok"
        labelKonfirmasi="Sesuaikan"
        proses={proses}
        alasanWajib
        onBatal={() => setDialog(null)}
        onKonfirmasi={simpanPenyesuaian}
      >
        <div className="space-y-3">
          <p>
            Varian <b>{dialog?.sku}</b> ({dialog?.produk}, {dialog?.ukuran} {dialog?.warna}) saat ini{" "}
            <b>{dialog?.stok_fisik}</b> fisik, <b>{dialog?.stok_tersedia}</b> tersedia.
          </p>
          <div>
            <Label htmlFor="penyesuaian-delta" className={LABEL_KOLOM}>Perubahan (positif menambah, negatif mengurangi)</Label>
            <Input
              id="penyesuaian-delta"
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              required
            />
          </div>
          {galatDialog && <ErrorState pesan={galatDialog} />}
        </div>
      </DialogKonfirmasi>
    </>
  );
}
