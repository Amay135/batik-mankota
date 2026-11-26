"use client";

import { useCallback, useEffect, useState } from "react";

import { api, pesanAksi, unduhBerkas } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LabelCetak, LabelCetakUkuran, ProdukAdmin } from "@/types/skema";

import { EmptyState, ErrorState, Memuat } from "./keadaan";

const LABEL_KOLOM = "mb-1.5 block text-[11px] text-dash-text-muted";
const UKURAN: LabelCetakUkuran[] = ["40x30", "58x40"];

export function LabelQr({ awalProduk, awalVarian }: { awalProduk?: string; awalVarian?: string }) {
  const [produk, setProduk] = useState<ProdukAdmin[] | null>(null);
  const [produkId, setProdukId] = useState(awalProduk ?? "");
  const [mode, setMode] = useState<"produk" | "varian">(awalVarian ? "varian" : "produk");
  const [terpilih, setTerpilih] = useState<number[]>(awalVarian ? [Number(awalVarian)] : []);
  const [salinan, setSalinan] = useState("1");
  const [ukuran, setUkuran] = useState<LabelCetakUkuran>("40x30");
  const [galat, setGalat] = useState("");
  const [galatUnduh, setGalatUnduh] = useState("");
  const [pesan, setPesan] = useState("");
  const [proses, setProses] = useState(false);

  const muat = useCallback(async () => {
    try {
      setProduk(await api<ProdukAdmin[]>("/katalog/kelola/produk/"));
      setGalat("");
    } catch (err) {
      setGalat(pesanAksi(err));
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  const dipilih = produk?.find((p) => String(p.id) === produkId) ?? null;
  const varian = dipilih?.varian ?? [];

  function pilihProduk(nilai: string) {
    setProdukId(nilai);
    setTerpilih(awalProduk === nilai && awalVarian ? [Number(awalVarian)] : []);
    setGalatUnduh("");
    setPesan("");
  }

  function ubahTerpilih(id: number) {
    setTerpilih((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  }

  async function unduh() {
    setGalatUnduh("");
    setPesan("");
    if (!dipilih) {
      setGalatUnduh("Pilih produk terlebih dahulu.");
      return;
    }
    if (mode === "varian" && terpilih.length === 0) {
      setGalatUnduh("Pilih minimal satu varian.");
      return;
    }
    const n = Number(salinan);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      setGalatUnduh("Jumlah salinan harus 1 sampai 100.");
      return;
    }
    const body: LabelCetak =
      mode === "produk"
        ? { ukuran, produk: dipilih.id, salinan: n }
        : { ukuran, salinan: n, varian: terpilih.map((id) => ({ id, salinan: n })) };
    setProses(true);
    try {
      await unduhBerkas("/katalog/label/", body, "label.pdf");
      setPesan("PDF label diunduh.");
    } catch (err) {
      setGalatUnduh(pesanAksi(err));
    } finally {
      setProses(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel-dasbor" aria-labelledby="judul-pilihan-cetak">
        <h2 id="judul-pilihan-cetak" className="font-sans text-[13px] font-semibold">Pilihan cetak</h2>
        {produk === null ? (
          galat ? <ErrorState pesan={galat} /> : <Memuat />
        ) : produk.length === 0 ? (
          <EmptyState pesan="Belum ada produk." />
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <Label htmlFor="label-produk" className={LABEL_KOLOM}>Produk</Label>
              <select
                id="label-produk"
                className="input-dasbor"
                value={produkId}
                onChange={(e) => pilihProduk(e.target.value)}
              >
                <option value="">Pilih produk</option>
                {produk.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="label-mode" className={LABEL_KOLOM}>Cakupan</Label>
              <select
                id="label-mode"
                className="input-dasbor"
                value={mode}
                onChange={(e) => setMode(e.target.value as "produk" | "varian")}
              >
                <option value="produk">Semua varian aktif</option>
                <option value="varian">Varian terpilih</option>
              </select>
            </div>
            <div>
              <Label htmlFor="label-ukuran" className={LABEL_KOLOM}>Ukuran label</Label>
              <select
                id="label-ukuran"
                className="input-dasbor"
                value={ukuran}
                onChange={(e) => setUkuran(e.target.value as LabelCetakUkuran)}
              >
                {UKURAN.map((u) => (
                  <option key={u} value={u}>{u} mm</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="label-salinan" className={LABEL_KOLOM}>Salinan per varian</Label>
              <Input
                id="label-salinan"
                type="number"
                min={1}
                max={100}
                value={salinan}
                onChange={(e) => setSalinan(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={unduh} disabled={proses || !dipilih}>
                {proses ? "Menyiapkan..." : "Unduh PDF"}
              </Button>
            </div>
          </div>
        )}
        {galatUnduh && <ErrorState pesan={galatUnduh} />}
        {pesan && <p role="status" className="mt-2 text-[11px] text-dash-text-muted">{pesan}</p>}
      </section>

      <section className="panel-dasbor" aria-labelledby="judul-pratinjau">
        <h2 id="judul-pratinjau" className="font-sans text-[13px] font-semibold">Pratinjau QR per varian</h2>
        {!dipilih ? (
          <EmptyState pesan="Pilih produk untuk melihat varian dan QR-nya." />
        ) : varian.length === 0 ? (
          <EmptyState pesan="Produk ini belum punya varian." />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {mode === "varian" && <TableHead className="w-10">Pilih</TableHead>}
                  <TableHead>QR</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Ukuran</TableHead>
                  <TableHead>Warna</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {varian.map((v) => (
                  <TableRow key={v.id}>
                    {mode === "varian" && (
                      <TableCell>
                        <input
                          type="checkbox"
                          aria-label={`Pilih ${v.sku}`}
                          checked={terpilih.includes(v.id)}
                          disabled={!v.aktif}
                          onChange={() => ubahTerpilih(v.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      {/* QR default SVG; endpoint memerlukan cookie admin. */}
                      <img
                        src={`/api/v1/katalog/varian/${v.id}/qr/`}
                        alt={`QR ${v.sku}`}
                        width={48}
                        height={48}
                        className="h-12 w-12 border border-dash-border bg-white p-0.5"
                      />
                    </TableCell>
                    <TableCell>{v.sku}</TableCell>
                    <TableCell>{v.ukuran}</TableCell>
                    <TableCell>{v.warna}</TableCell>
                    <TableCell>
                      <span className={`lencana ${v.aktif ? "lencana-utama" : "lencana-redup"}`}>
                        {v.aktif ? "Aktif" : "Nonaktif"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
