"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { api, pesanAksi } from "@/lib/api";
import { tanggalJakarta } from "@/lib/format";
import { keGrid, validasiTabelPanduan } from "@/lib/panduan-ukuran";
import type { KategoriAdmin, PanduanUkuranAdmin } from "@/types/skema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { DialogKonfirmasi } from "./dialog-konfirmasi";
import { EmptyState, ErrorState, Memuat } from "./keadaan";

const LABEL_KOLOM = "mb-1.5 block text-[11px] text-dash-text-muted";
const GRID_AWAL = [
  ["Ukuran", "Keterangan"],
  ["", ""],
];

export function PanduanUkuran() {
  const [daftar, setDaftar] = useState<PanduanUkuranAdmin[] | null>(null);
  const [kategori, setKategori] = useState<KategoriAdmin[]>([]);
  const [pilihan, setPilihan] = useState("");
  const [grid, setGrid] = useState<string[][]>(GRID_AWAL);
  const [idPanduan, setIdPanduan] = useState<number | null>(null);
  const [galat, setGalat] = useState("");
  const [galatSimpan, setGalatSimpan] = useState("");
  const [pesan, setPesan] = useState("");
  const [proses, setProses] = useState(false);
  const [dialogHapus, setDialogHapus] = useState<PanduanUkuranAdmin | null>(null);
  const [galatHapus, setGalatHapus] = useState("");

  const muat = useCallback(async () => {
    try {
      const [panduan, semuaKategori] = await Promise.all([
        api<PanduanUkuranAdmin[]>("/katalog/kelola/panduan-ukuran/"),
        api<KategoriAdmin[]>("/katalog/kelola/kategori/"),
      ]);
      setDaftar(panduan);
      setKategori(semuaKategori);
      setGalat("");
    } catch (err) {
      setGalat(pesanAksi(err));
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  const namaKategori = useMemo(
    () => new Map(kategori.map((k) => [k.id, k.nama])),
    [kategori],
  );

  function pilih(nilai: string) {
    setPilihan(nilai);
    setGalatSimpan("");
    setPesan("");
    const ada = (daftar ?? []).find((p) => String(p.kategori) === nilai);
    if (ada) {
      setIdPanduan(ada.id);
      setGrid(keGrid(ada.tabel).length ? keGrid(ada.tabel) : GRID_AWAL);
    } else {
      setIdPanduan(null);
      setGrid(GRID_AWAL);
    }
  }

  function ubahSel(baris: number, kolom: number, nilai: string) {
    setGrid((g) => g.map((r, i) => (i === baris ? r.map((s, j) => (j === kolom ? nilai : s)) : r)));
  }

  function tambahBaris() {
    setGrid((g) => [...g, Array(g[0].length).fill("")]);
  }

  function hapusBaris() {
    setGrid((g) => (g.length > 2 ? g.slice(0, -1) : g));
  }

  function tambahKolom() {
    setGrid((g) => g.map((r) => [...r, ""]));
  }

  function hapusKolom() {
    setGrid((g) => (g[0].length > 2 ? g.map((r) => r.slice(0, -1)) : g));
  }

  async function simpan() {
    setGalatSimpan("");
    setPesan("");
    if (!pilihan) {
      setGalatSimpan("Pilih kategori terlebih dahulu.");
      return;
    }
    const valid = validasiTabelPanduan(grid);
    if (!valid.ok) {
      setGalatSimpan(valid.pesan);
      return;
    }
    setProses(true);
    try {
      const body = { kategori: Number(pilihan), tabel: grid };
      if (idPanduan) {
        await api(`/katalog/kelola/panduan-ukuran/${idPanduan}/`, { method: "PATCH", body });
      } else {
        const baru = await api<PanduanUkuranAdmin>("/katalog/kelola/panduan-ukuran/", {
          method: "POST",
          body,
        });
        setIdPanduan(baru.id);
      }
      setPesan("Panduan ukuran disimpan.");
      await muat();
    } catch (err) {
      setGalatSimpan(pesanAksi(err));
    } finally {
      setProses(false);
    }
  }

  async function hapus() {
    if (!dialogHapus) return;
    setProses(true);
    setGalatHapus("");
    try {
      await api(`/katalog/kelola/panduan-ukuran/${dialogHapus.id}/`, { method: "DELETE" });
      setPesan("Panduan ukuran dihapus.");
      setDialogHapus(null);
      if (String(dialogHapus.kategori) === pilihan) {
        setPilihan("");
        setIdPanduan(null);
        setGrid(GRID_AWAL);
      }
      await muat();
    } catch (err) {
      setGalatHapus(pesanAksi(err));
    } finally {
      setProses(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Panduan Ukuran</h1>
        <p className="mt-1 text-[12px] text-dash-text-muted">
          Satu tabel per kategori. Baris pertama adalah header.
        </p>
      </header>

      <section className="panel-dasbor" aria-labelledby="judul-daftar-panduan">
        <h2 id="judul-daftar-panduan" className="font-sans text-[13px] font-semibold">Daftar panduan</h2>
        {daftar === null ? (
          galat ? <ErrorState pesan={galat} /> : <Memuat />
        ) : daftar.length === 0 ? (
          <EmptyState pesan="Belum ada panduan ukuran." />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Kategori</TableHead>
                  <TableHead>Diperbarui</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daftar.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{namaKategori.get(p.kategori) ?? `Kategori #${p.kategori}`}</TableCell>
                    <TableCell>{tanggalJakarta(p.diperbarui)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-[11.5px]"
                          onClick={() => pilih(String(p.kategori))}
                        >
                          Ubah
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-[11.5px]"
                          onClick={() => {
                            setGalatHapus("");
                            setDialogHapus(p);
                          }}
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
      </section>

      <section className="panel-dasbor" aria-labelledby="judul-editor-panduan">
        <h2 id="judul-editor-panduan" className="font-sans text-[13px] font-semibold">Editor tabel</h2>
        {pesan && <p role="status" className="mt-2 text-[11px] text-dash-text-muted">{pesan}</p>}
        <div className="mt-4 max-w-xs">
          <Label htmlFor="panduan-kategori" className={LABEL_KOLOM}>Kategori</Label>
          <select
            id="panduan-kategori"
            className="input-dasbor"
            value={pilihan}
            onChange={(e) => pilih(e.target.value)}
          >
            <option value="">Pilih kategori</option>
            {kategori.map((k) => (
              <option key={k.id} value={String(k.id)}>{k.nama}</option>
            ))}
          </select>
        </div>

        {!pilihan ? (
          <EmptyState pesan="Pilih kategori untuk mulai mengedit." />
        ) : (
          <div className="mt-4 space-y-4">
            <div className="overflow-x-auto">
              <table className="tabel-dasbor">
                <tbody>
                  {grid.map((baris, r) => (
                    <tr key={r}>
                      {baris.map((sel, c) => (
                        <td key={c}>
                          <input
                            aria-label={`Baris ${r + 1} kolom ${c + 1}`}
                            className="input-dasbor min-w-28"
                            value={sel}
                            maxLength={20}
                            onChange={(e) => ubahSel(r, c, e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={tambahBaris}>Tambah baris</Button>
              <Button type="button" variant="outline" size="sm" onClick={hapusBaris} disabled={grid.length <= 2}>
                Hapus baris
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={tambahKolom}>Tambah kolom</Button>
              <Button type="button" variant="outline" size="sm" onClick={hapusKolom} disabled={grid[0].length <= 2}>
                Hapus kolom
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" onClick={simpan} disabled={proses}>
                {proses ? "Menyimpan..." : "Simpan panduan"}
              </Button>
              {galatSimpan && <ErrorState pesan={galatSimpan} />}
            </div>
          </div>
        )}
      </section>

      <DialogKonfirmasi
        terbuka={dialogHapus !== null}
        judul="Hapus panduan ukuran"
        labelKonfirmasi="Hapus"
        proses={proses}
        onBatal={() => setDialogHapus(null)}
        onKonfirmasi={hapus}
      >
        <p>
          Panduan untuk kategori{" "}
          <b>{dialogHapus ? namaKategori.get(dialogHapus.kategori) ?? `#${dialogHapus.kategori}` : ""}</b>{" "}
          akan dihapus permanen.
        </p>
        {galatHapus && <ErrorState pesan={galatHapus} />}
      </DialogKonfirmasi>
    </div>
  );
}
