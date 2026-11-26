"use client";

import { useState } from "react";

import { api, pesanAksi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { KategoriAdmin, MotifAdmin } from "@/types/skema";

import { ModalDasbor } from "./modal-dasbor";
import { EmptyState, ErrorState } from "./keadaan";

const LABEL_KOLOM = "mb-1.5 block text-[11px] text-dash-text-muted";
const KATEGORI_KOSONG = { nama: "", slug: "", label_pendek: "", urutan: "0" };
const MOTIF_KOSONG = { nama: "", slug: "", deskripsi: "" };

type Props = {
  terbuka: boolean;
  kategori: KategoriAdmin[];
  motif: MotifAdmin[];
  onTutup: () => void;
  onBerubah: () => Promise<void>;
};

export function DialogKategoriMotif({ terbuka, kategori, motif, onTutup, onBerubah }: Props) {
  const [tab, setTab] = useState<"kategori" | "motif">("kategori");
  const [kategoriForm, setKategoriForm] = useState(KATEGORI_KOSONG);
  const [motifForm, setMotifForm] = useState(MOTIF_KOSONG);
  const [ubahId, setUbahId] = useState<number | null>(null);
  const [hapusId, setHapusId] = useState<number | null>(null);
  const [galat, setGalat] = useState("");
  const [pesan, setPesan] = useState("");
  const [proses, setProses] = useState(false);

  function reset() {
    setUbahId(null);
    setHapusId(null);
    setKategoriForm(KATEGORI_KOSONG);
    setMotifForm(MOTIF_KOSONG);
    setGalat("");
    setPesan("");
  }

  function gantiTab(nilai: "kategori" | "motif") {
    setTab(nilai);
    reset();
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalat("");
    setPesan("");
    setProses(true);
    try {
      if (tab === "kategori") {
        const body = {
          nama: kategoriForm.nama,
          slug: kategoriForm.slug,
          label_pendek: kategoriForm.label_pendek,
          urutan: Number(kategoriForm.urutan),
        };
        if (ubahId) await api(`/katalog/kelola/kategori/${ubahId}/`, { method: "PATCH", body });
        else await api("/katalog/kelola/kategori/", { method: "POST", body });
      } else {
        const body = { nama: motifForm.nama, slug: motifForm.slug, deskripsi: motifForm.deskripsi };
        if (ubahId) await api(`/katalog/kelola/motif/${ubahId}/`, { method: "PATCH", body });
        else await api("/katalog/kelola/motif/", { method: "POST", body });
      }
      setPesan(ubahId ? "Perubahan disimpan." : "Data ditambahkan.");
      reset();
      await onBerubah();
    } catch (err) {
      setGalat(pesanAksi(err));
    } finally {
      setProses(false);
    }
  }

  async function hapus() {
    if (!hapusId) return;
    setProses(true);
    setGalat("");
    setPesan("");
    try {
      const path = tab === "kategori" ? "kategori" : "motif";
      await api(`/katalog/kelola/${path}/${hapusId}/`, { method: "DELETE" });
      setPesan("Data dihapus.");
      reset();
      await onBerubah();
    } catch (err) {
      setGalat(pesanAksi(err));
    } finally {
      setProses(false);
      setHapusId(null);
    }
  }

  return (
    <ModalDasbor terbuka={terbuka} judul="Kelola kategori & motif" onTutup={onTutup}>
      <div className="mb-4 flex gap-2">
        <Button
          type="button"
          variant={tab === "kategori" ? "default" : "outline"}
          size="sm"
          onClick={() => gantiTab("kategori")}
        >
          Kategori
        </Button>
        <Button
          type="button"
          variant={tab === "motif" ? "default" : "outline"}
          size="sm"
          onClick={() => gantiTab("motif")}
        >
          Motif
        </Button>
      </div>

      <form onSubmit={simpan} className="grid gap-3 sm:grid-cols-2">
        {tab === "kategori" ? (
          <>
            <div>
              <Label htmlFor="kategori-nama" className={LABEL_KOLOM}>Nama</Label>
              <Input
                id="kategori-nama"
                value={kategoriForm.nama}
                onChange={(e) => setKategoriForm((f) => ({ ...f, nama: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="kategori-slug" className={LABEL_KOLOM}>Slug</Label>
              <Input
                id="kategori-slug"
                value={kategoriForm.slug}
                onChange={(e) => setKategoriForm((f) => ({ ...f, slug: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="kategori-label" className={LABEL_KOLOM}>Label pendek</Label>
              <Input
                id="kategori-label"
                value={kategoriForm.label_pendek}
                onChange={(e) => setKategoriForm((f) => ({ ...f, label_pendek: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="kategori-urutan" className={LABEL_KOLOM}>Urutan</Label>
              <Input
                id="kategori-urutan"
                type="number"
                min={0}
                value={kategoriForm.urutan}
                onChange={(e) => setKategoriForm((f) => ({ ...f, urutan: e.target.value }))}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <Label htmlFor="motif-nama" className={LABEL_KOLOM}>Nama</Label>
              <Input
                id="motif-nama"
                value={motifForm.nama}
                onChange={(e) => setMotifForm((f) => ({ ...f, nama: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="motif-slug" className={LABEL_KOLOM}>Slug</Label>
              <Input
                id="motif-slug"
                value={motifForm.slug}
                onChange={(e) => setMotifForm((f) => ({ ...f, slug: e.target.value }))}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="motif-deskripsi" className={LABEL_KOLOM}>Deskripsi</Label>
              <Input
                id="motif-deskripsi"
                value={motifForm.deskripsi}
                onChange={(e) => setMotifForm((f) => ({ ...f, deskripsi: e.target.value }))}
              />
            </div>
          </>
        )}
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={proses}>
            {ubahId ? "Simpan perubahan" : "Tambah"}
          </Button>
          {ubahId && (
            <Button type="button" variant="outline" onClick={reset}>
              Batal ubah
            </Button>
          )}
          {galat && <ErrorState pesan={galat} />}
          {pesan && <p role="status" className="text-[11px] text-dash-text-muted">{pesan}</p>}
        </div>
      </form>

      <div className="mt-5 overflow-x-auto">
        {tab === "kategori" ? (
          kategori.length === 0 ? (
            <EmptyState pesan="Belum ada kategori." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nama</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Urutan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kategori.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell>{k.nama}</TableCell>
                    <TableCell>{k.slug}</TableCell>
                    <TableCell>{k.label_pendek}</TableCell>
                    <TableCell>{k.urutan ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-[11.5px]"
                          onClick={() => {
                            setUbahId(k.id);
                            setHapusId(null);
                            setKategoriForm({
                              nama: k.nama,
                              slug: k.slug,
                              label_pendek: k.label_pendek,
                              urutan: String(k.urutan ?? 0),
                            });
                          }}
                        >
                          Ubah
                        </Button>
                        {hapusId === k.id ? (
                          <>
                            <Button type="button" size="sm" className="h-8 px-2.5 text-[11.5px]" onClick={hapus} disabled={proses}>
                              Yakin hapus
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="h-8 px-2.5 text-[11.5px]" onClick={() => setHapusId(null)}>
                              Batal
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-[11.5px]"
                            onClick={() => setHapusId(k.id)}
                          >
                            Hapus
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        ) : motif.length === 0 ? (
          <EmptyState pesan="Belum ada motif." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nama</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {motif.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.nama}</TableCell>
                  <TableCell>{m.slug}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-[11.5px]"
                        onClick={() => {
                          setUbahId(m.id);
                          setHapusId(null);
                          setMotifForm({ nama: m.nama, slug: m.slug, deskripsi: m.deskripsi ?? "" });
                        }}
                      >
                        Ubah
                      </Button>
                      {hapusId === m.id ? (
                        <>
                          <Button type="button" size="sm" className="h-8 px-2.5 text-[11.5px]" onClick={hapus} disabled={proses}>
                            Yakin hapus
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="h-8 px-2.5 text-[11.5px]" onClick={() => setHapusId(null)}>
                            Batal
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-[11.5px]"
                          onClick={() => setHapusId(m.id)}
                        >
                          Hapus
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </ModalDasbor>
  );
}
