"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { api, pesanAksi } from "@/lib/api";
import { tanggalJakarta } from "@/lib/format";
import { saringUlasan } from "@/lib/saring-dasbor";
import type { ProdukAdmin, UlasanAdmin } from "@/types/skema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { DialogKonfirmasi } from "./dialog-konfirmasi";
import { EmptyState, ErrorState, Memuat } from "./keadaan";

const LABEL_KOLOM = "mb-1.5 block text-[11px] text-dash-text-muted";

export function UlasanDasbor() {
  const [daftar, setDaftar] = useState<UlasanAdmin[] | null>(null);
  const [produk, setProduk] = useState<ProdukAdmin[]>([]);
  const [galat, setGalat] = useState("");
  const [filter, setFilter] = useState({ produk: "", rating: "", tampil: "" });
  const [dialog, setDialog] = useState<UlasanAdmin | null>(null);
  const [proses, setProses] = useState(false);
  const [galatDialog, setGalatDialog] = useState("");
  const [pesan, setPesan] = useState("");

  const muat = useCallback(async () => {
    try {
      const [ulasan, semuaProduk] = await Promise.all([
        api<UlasanAdmin[]>("/katalog/kelola/ulasan/"),
        api<ProdukAdmin[]>("/katalog/kelola/produk/"),
      ]);
      setDaftar(ulasan);
      setProduk(semuaProduk);
      setGalat("");
    } catch (err) {
      setGalat(pesanAksi(err));
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  const hasil = useMemo(() => saringUlasan(daftar ?? [], filter), [daftar, filter]);
  const namaProduk = useMemo(() => new Map(produk.map((p) => [p.slug, p.nama])), [produk]);
  const opsiProduk = useMemo(
    () => [...new Set((daftar ?? []).map((u) => u.produk))].sort(),
    [daftar],
  );

  async function ubahTampil() {
    if (!dialog) return;
    setProses(true);
    setGalatDialog("");
    try {
      await api(`/katalog/kelola/ulasan/${dialog.id}/`, {
        method: "PATCH",
        body: { tampil: !dialog.tampil },
      });
      setPesan(`Ulasan #${dialog.id} ${dialog.tampil ? "disembunyikan" : "ditampilkan"}.`);
      setDialog(null);
      await muat();
    } catch (err) {
      setGalatDialog(pesanAksi(err));
    } finally {
      setProses(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Ulasan</h1>
        <p className="mt-1 text-[12px] text-dash-text-muted">
          Sembunyikan ulasan yang tidak pantas. Ulasan tidak dihapus permanen.
        </p>
      </header>

      <section className="panel-dasbor" aria-label="Filter ulasan">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="filter-ulasan-produk" className={LABEL_KOLOM}>Produk</Label>
            <select
              id="filter-ulasan-produk"
              className="input-dasbor"
              value={filter.produk}
              onChange={(e) => setFilter((f) => ({ ...f, produk: e.target.value }))}
            >
              <option value="">Semua produk</option>
              {opsiProduk.map((slug) => (
                <option key={slug} value={slug}>{namaProduk.get(slug) ?? slug}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="filter-ulasan-rating" className={LABEL_KOLOM}>Rating</Label>
            <select
              id="filter-ulasan-rating"
              className="input-dasbor"
              value={filter.rating}
              onChange={(e) => setFilter((f) => ({ ...f, rating: e.target.value }))}
            >
              <option value="">Semua rating</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={String(n)}>{n} bintang</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="filter-ulasan-tampil" className={LABEL_KOLOM}>Status tampil</Label>
            <select
              id="filter-ulasan-tampil"
              className="input-dasbor"
              value={filter.tampil}
              onChange={(e) => setFilter((f) => ({ ...f, tampil: e.target.value }))}
            >
              <option value="">Semua status</option>
              <option value="true">Tampil</option>
              <option value="false">Disembunyikan</option>
            </select>
          </div>
        </div>
      </section>

      <section className="panel-dasbor" aria-labelledby="judul-ulasan">
        <h2 id="judul-ulasan" className="font-sans text-[13px] font-semibold">Daftar ulasan</h2>
        {pesan && <p role="status" className="mt-2 text-[11px] text-dash-text-muted">{pesan}</p>}
        {daftar === null ? (
          galat ? <ErrorState pesan={galat} /> : <Memuat />
        ) : hasil.length === 0 ? (
          <EmptyState pesan="Tidak ada ulasan yang cocok dengan filter." />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Produk</TableHead>
                  <TableHead>Pengguna</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Ulasan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hasil.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{namaProduk.get(u.produk) ?? u.produk}</TableCell>
                    <TableCell>{u.pengguna}</TableCell>
                    <TableCell>{u.rating} ★</TableCell>
                    <TableCell className="max-w-[280px] whitespace-pre-wrap">{u.teks || "—"}</TableCell>
                    <TableCell>
                      <span className={`lencana ${u.tampil ? "lencana-utama" : "lencana-redup"}`}>
                        {u.tampil ? "Tampil" : "Disembunyikan"}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{tanggalJakarta(u.dibuat)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-[11.5px]"
                          onClick={() => {
                            setGalatDialog("");
                            setDialog(u);
                          }}
                        >
                          {u.tampil ? "Sembunyikan" : "Tampilkan"}
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

      <DialogKonfirmasi
        terbuka={dialog !== null}
        judul="Ubah tampilan ulasan"
        labelKonfirmasi={dialog?.tampil ? "Sembunyikan" : "Tampilkan"}
        proses={proses}
        onBatal={() => setDialog(null)}
        onKonfirmasi={ubahTampil}
      >
        <p>
          Ulasan dari <b>{dialog?.pengguna}</b> untuk produk <b>{dialog ? namaProduk.get(dialog.produk) ?? dialog.produk : ""}</b>{" "}
          akan {dialog?.tampil ? "disembunyikan dari katalog" : "ditampilkan lagi di katalog"}.
        </p>
        {galatDialog && <ErrorState pesan={galatDialog} />}
      </DialogKonfirmasi>
    </div>
  );
}
