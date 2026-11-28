"use client";

import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { api, pesanAksi } from "@/lib/api";
import { waktuJakarta } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { HalamanOpname, HalamanStok, Opname, OpnameRingkas, Stok } from "@/types/skema";

import { DataTable } from "./data-table";
import { DialogKonfirmasi } from "./dialog-konfirmasi";
import { EmptyState, ErrorState, Memuat } from "./keadaan";

const LABEL_KOLOM = "mb-1.5 block text-[11px] text-dash-text-muted";
const PER_HALAMAN_RIWAYAT = 20;

type Hitungan = {
  varian: number;
  sku: string;
  produk: string;
  ukuran: string;
  warna: string;
  stok_fisik: number;
  qty_fisik: string;
};

export function OpnameDasbor() {
  const [cari, setCari] = useState("");
  const [hasilCari, setHasilCari] = useState<Stok[] | null>(null);
  const [galatCari, setGalatCari] = useState("");
  const [items, setItems] = useState<Hitungan[]>([]);
  const [catatan, setCatatan] = useState("");
  const [galatBuat, setGalatBuat] = useState("");
  const [proses, setProses] = useState(false);
  const [sesi, setSesi] = useState<Opname | null>(null);
  const [dialogTerapkan, setDialogTerapkan] = useState(false);
  const [galatTerapkan, setGalatTerapkan] = useState("");
  const [riwayat, setRiwayat] = useState<OpnameRingkas[]>([]);
  const [totalRiwayat, setTotalRiwayat] = useState(0);
  const [halamanRiwayat, setHalamanRiwayat] = useState(1);
  const [memuatRiwayat, setMemuatRiwayat] = useState(true);
  const [galatRiwayat, setGalatRiwayat] = useState("");
  const [galatDetail, setGalatDetail] = useState("");

  const muatRiwayat = useCallback(async () => {
    setMemuatRiwayat(true);
    setGalatRiwayat("");
    try {
      const data = await api<HalamanOpname>(
        `/stok/opname/?page=${halamanRiwayat}&per_halaman=${PER_HALAMAN_RIWAYAT}`,
      );
      setRiwayat(data.results);
      setTotalRiwayat(data.count);
    } catch (err) {
      setGalatRiwayat(pesanAksi(err) || "Gagal memuat riwayat opname.");
    } finally {
      setMemuatRiwayat(false);
    }
  }, [halamanRiwayat]);

  useEffect(() => {
    void muatRiwayat();
  }, [muatRiwayat]);

  async function bukaRiwayat(id: number) {
    setGalatDetail("");
    try {
      setSesi(await api<Opname>(`/stok/opname/${id}/`));
    } catch (err) {
      setGalatDetail(pesanAksi(err) || "Gagal memuat detail opname.");
    }
  }

  const cariVarian = useCallback(async () => {
    try {
      const q = new URLSearchParams({ per_halaman: "20" });
      if (cari) q.set("q", cari);
      const data = await api<HalamanStok>(`/stok/?${q}`);
      setHasilCari(data.results);
      setGalatCari("");
    } catch (err) {
      setHasilCari([]);
      setGalatCari(pesanAksi(err) || "Gagal mencari varian.");
    }
  }, [cari]);

  useEffect(() => {
    void cariVarian();
  }, [cariVarian]);

  function tambah(s: Stok) {
    setItems((t) =>
      t.some((i) => i.varian === s.varian)
        ? t
        : [
            ...t,
            {
              varian: s.varian,
              sku: s.sku,
              produk: s.produk,
              ukuran: s.ukuran,
              warna: s.warna,
              stok_fisik: s.stok_fisik,
              qty_fisik: String(s.stok_fisik),
            },
          ],
    );
    setGalatBuat("");
  }

  function ubahQty(varian: number, nilai: string) {
    setItems((t) => t.map((i) => (i.varian === varian ? { ...i, qty_fisik: nilai } : i)));
  }

  async function buat() {
    setGalatBuat("");
    if (!catatan.trim()) {
      setGalatBuat("Catatan wajib diisi.");
      return;
    }
    if (items.length === 0) {
      setGalatBuat("Tambahkan minimal satu varian untuk dihitung.");
      return;
    }
    if (items.some((i) => i.qty_fisik === "" || Number(i.qty_fisik) < 0)) {
      setGalatBuat("Jumlah fisik harus bilangan bulat 0 atau lebih.");
      return;
    }
    setProses(true);
    try {
      const data = await api<Opname>("/stok/opname/", {
        method: "POST",
        body: {
          catatan,
          items: items.map((i) => ({ varian_id: i.varian, qty_fisik: Number(i.qty_fisik) })),
        },
      });
      setSesi(data);
      setGalatDetail("");
      setItems([]);
      setCatatan("");
      await muatRiwayat();
    } catch (err) {
      setGalatBuat(pesanAksi(err));
    } finally {
      setProses(false);
    }
  }

  async function terapkan() {
    if (!sesi) return;
    setProses(true);
    setGalatTerapkan("");
    try {
      setSesi(await api<Opname>(`/stok/opname/${sesi.id}/terapkan/`, { method: "POST" }));
      setDialogTerapkan(false);
      await muatRiwayat();
    } catch (err) {
      setGalatTerapkan(pesanAksi(err));
    } finally {
      setProses(false);
    }
  }

  const diterapkan = sesi?.status === "APPLIED";

  const kolomRiwayat: ColumnDef<OpnameRingkas, unknown>[] = [
    {
      id: "tanggal",
      header: "Tanggal",
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{waktuJakarta(row.original.created_at)}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <span
          className={`lencana ${row.original.status === "APPLIED" ? "lencana-utama" : "lencana-redup"}`}
        >
          {row.original.status_label}
        </span>
      ),
    },
    { id: "varian", header: "Varian dihitung", cell: ({ row }) => row.original.jumlah_varian },
    {
      id: "selisih",
      header: "Varian berselisih",
      cell: ({ row }) => row.original.jumlah_selisih,
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
            onClick={() => void bukaRiwayat(row.original.id)}
          >
            Lihat detail
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="panel-dasbor" aria-labelledby="judul-riwayat">
        <h2 id="judul-riwayat" className="font-sans text-[13px] font-semibold">
          Riwayat opname
        </h2>
        {memuatRiwayat ? (
          <Memuat pesan="Memuat riwayat opname..." />
        ) : galatRiwayat ? (
          <ErrorState pesan={galatRiwayat} />
        ) : (
          <div className="mt-3">
            <DataTable
              kolom={kolomRiwayat}
              data={riwayat}
              total={totalRiwayat}
              halaman={halamanRiwayat}
              perHalaman={PER_HALAMAN_RIWAYAT}
              onHalaman={setHalamanRiwayat}
              kosong="Belum ada opname."
            />
          </div>
        )}
      </section>

      {galatDetail && <ErrorState pesan={galatDetail} />}

      {sesi ? (
        <section className="panel-dasbor" aria-labelledby="judul-sesi">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="judul-sesi" className="font-sans text-[13px] font-semibold">
              Sesi opname #{sesi.id}
            </h2>
            <span className={`lencana ${diterapkan ? "lencana-utama" : "lencana-redup"}`}>
              {sesi.status_label}
            </span>
          </div>
          <p className="mt-2 text-[11.5px] text-dash-text-muted">
            Dibuat oleh {sesi.dibuat_oleh} · {waktuJakarta(sesi.created_at)}
            {sesi.applied_at && ` · diterapkan ${waktuJakarta(sesi.applied_at)}`}
          </p>
          <p className="mt-1 text-[12px]">Catatan: {sesi.catatan}</p>
          <p className="mt-1 text-[11px] text-dash-text-muted">
            Sistem = stok saat sesi dibuat; Fisik = hasil hitung. Penerapan memakai
            selisih fisik − sistem.
          </p>

          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Produk</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Ukuran</TableHead>
                  <TableHead>Warna</TableHead>
                  <TableHead>Sistem</TableHead>
                  <TableHead>Fisik</TableHead>
                  <TableHead>Selisih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sesi.items.map((i) => (
                  <TableRow key={i.varian}>
                    <TableCell>{i.produk}</TableCell>
                    <TableCell>{i.sku}</TableCell>
                    <TableCell>{i.ukuran}</TableCell>
                    <TableCell>{i.warna}</TableCell>
                    <TableCell>{i.system_qty}</TableCell>
                    <TableCell>{i.counted_qty}</TableCell>
                    <TableCell>{i.selisih > 0 ? `+${i.selisih}` : i.selisih}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!diterapkan && (
              <Button
                type="button"
                onClick={() => {
                  setGalatTerapkan("");
                  setDialogTerapkan(true);
                }}
              >
                Terapkan opname
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setSesi(null)}>
              Sesi baru
            </Button>
            {diterapkan && (
              <p className="text-[11px] text-dash-text-muted">Stok sudah disesuaikan dengan hitungan fisik.</p>
            )}
          </div>
        </section>
      ) : (
        <>
          <section className="panel-dasbor" aria-labelledby="judul-pilih-varian">
            <h2 id="judul-pilih-varian" className="font-sans text-[13px] font-semibold">Pilih varian</h2>
            <div className="mt-3 max-w-sm">
              <Label htmlFor="opname-cari" className={LABEL_KOLOM}>Cari produk atau SKU</Label>
              <Input
                id="opname-cari"
                type="search"
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Nama produk atau SKU"
              />
            </div>
            {hasilCari === null ? (
              <Memuat />
            ) : galatCari ? (
              <ErrorState pesan={galatCari} />
            ) : hasilCari.length === 0 ? (
              <EmptyState pesan="Tidak ada varian yang cocok." />
            ) : (
              <div className="mt-3 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Produk</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Ukuran</TableHead>
                      <TableHead>Warna</TableHead>
                      <TableHead>Fisik</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hasilCari.map((s) => (
                      <TableRow key={s.varian}>
                        <TableCell>{s.produk}</TableCell>
                        <TableCell>{s.sku}</TableCell>
                        <TableCell>{s.ukuran}</TableCell>
                        <TableCell>{s.warna}</TableCell>
                        <TableCell>{s.stok_fisik}</TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-[11.5px]"
                              disabled={items.some((i) => i.varian === s.varian)}
                              onClick={() => tambah(s)}
                            >
                              Tambah
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          <section className="panel-dasbor" aria-labelledby="judul-hitungan">
            <h2 id="judul-hitungan" className="font-sans text-[13px] font-semibold">Hitungan fisik</h2>
            {items.length === 0 ? (
              <EmptyState pesan="Belum ada varian yang ditambahkan." />
            ) : (
              <div className="mt-3 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Produk</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Sistem</TableHead>
                      <TableHead>Jumlah fisik</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((i) => (
                      <TableRow key={i.varian}>
                        <TableCell>{i.produk}</TableCell>
                        <TableCell>{i.sku}</TableCell>
                        <TableCell>{i.stok_fisik}</TableCell>
                        <TableCell>
                          <Input
                            aria-label={`Jumlah fisik ${i.sku}`}
                            type="number"
                            min={0}
                            className="max-w-24"
                            value={i.qty_fisik}
                            onChange={(e) => ubahQty(i.varian, e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-[11.5px]"
                              onClick={() => setItems((t) => t.filter((x) => x.varian !== i.varian))}
                            >
                              Hapus
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="mt-4 max-w-md">
              <Label htmlFor="opname-catatan" className={LABEL_KOLOM}>Catatan sesi</Label>
              <Input
                id="opname-catatan"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                required
              />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Button type="button" onClick={buat} disabled={proses}>
                {proses ? "Menyimpan..." : "Buat sesi opname"}
              </Button>
              {galatBuat && <ErrorState pesan={galatBuat} />}
            </div>
          </section>
        </>
      )}

      <DialogKonfirmasi
        terbuka={dialogTerapkan}
        judul="Terapkan opname"
        labelKonfirmasi="Terapkan"
        proses={proses}
        onBatal={() => setDialogTerapkan(false)}
        onKonfirmasi={terapkan}
      >
        <p>
          Stok sistem untuk {sesi?.items.length ?? 0} varian akan disesuaikan dengan hitungan fisik.
          Tindakan ini tercatat di audit log.
        </p>
        {galatTerapkan && <ErrorState pesan={galatTerapkan} />}
      </DialogKonfirmasi>
    </div>
  );
}
