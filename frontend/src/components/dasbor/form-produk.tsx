"use client";

import { useState } from "react";

import { api, galatPerField, pesanAksi } from "@/lib/api";
import { rupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FotoAdmin, KategoriAdmin, MotifAdmin, ProdukAdmin, VarianAdmin } from "@/types/skema";

import { ModalDasbor } from "./modal-dasbor";
import { ErrorState } from "./keadaan";

const LABEL_KOLOM = "mb-1.5 block text-[11px] text-dash-text-muted";
const TEKNIK = [
  ["tulis", "Batik Tulis"],
  ["cap", "Batik Cap"],
  ["kombinasi", "Kombinasi"],
] as const;
const WARNA = ["indigo", "soga", "krem", "hitam"] as const;
const BENTUK = ["kemeja", "blus", "dress", "rok", "outer", "kain", "selendang", "pouch"];
const UKURAN: VarianAdmin["ukuran"][] = ["S", "M", "L", "XL", "XXL", "ALL"];

type Form = {
  nama: string;
  slug: string;
  kategori: string;
  teknik: ProdukAdmin["teknik"];
  motif: string;
  bentuk: string;
  warna_utama: ProdukAdmin["warna_utama"];
  koleksi: string;
  perajin: string;
  deskripsi: string;
  bahan_detail: string;
  perawatan: string;
  cerita_judul: string;
  cerita_isi: string;
  harga: string;
  unggulan: boolean;
  aktif: boolean;
};

type FormVarian = {
  id?: number;
  warna: VarianAdmin["warna"];
  ukuran: VarianAdmin["ukuran"];
  sku: string;
  harga_beli: string;
  aktif: boolean;
};

type Props = {
  produk: ProdukAdmin | null;
  kategori: KategoriAdmin[];
  motif: MotifAdmin[];
  onTutup: () => void;
  onBerhasil: (pesan: string) => Promise<void>;
};

function formAwal(p: ProdukAdmin | null): Form {
  return {
    nama: p?.nama ?? "",
    slug: p?.slug ?? "",
    kategori: p ? String(p.kategori) : "",
    teknik: p?.teknik ?? "tulis",
    motif: p?.motif ?? "",
    bentuk: p?.bentuk ?? "kemeja",
    warna_utama: p?.warna_utama ?? "indigo",
    koleksi: p?.koleksi ?? "",
    perajin: p?.perajin ?? "",
    deskripsi: p?.deskripsi ?? "",
    bahan_detail: p?.bahan_detail ?? "",
    perawatan: p?.perawatan ?? "",
    cerita_judul: p?.cerita_judul ?? "",
    cerita_isi: p?.cerita_isi ?? "",
    harga: p ? String(p.harga) : "",
    unggulan: p?.unggulan ?? false,
    aktif: p?.aktif ?? true,
  };
}

function varianAwal(p: ProdukAdmin | null): FormVarian[] {
  return (p?.varian ?? []).map((v) => ({
    id: v.id,
    warna: v.warna,
    ukuran: v.ukuran,
    sku: v.sku,
    harga_beli: String(v.harga_beli ?? 0),
    aktif: v.aktif ?? true,
  }));
}

export function FormProduk({ produk, kategori, motif, onTutup, onBerhasil }: Props) {
  const [form, setForm] = useState<Form>(() => formAwal(produk));
  const [varian, setVarian] = useState<FormVarian[]>(() => varianAwal(produk));
  const [foto, setFoto] = useState<FotoAdmin[]>(() => produk?.foto ?? []);
  const [galatField, setGalatField] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState("");
  const [proses, setProses] = useState(false);
  const [unggahan, setUnggahan] = useState<{ file: File; alt: string; urutan: string }[]>([]);
  const [galatFoto, setGalatFoto] = useState("");
  const [pesanFoto, setPesanFoto] = useState("");

  function ubah<K extends keyof Form>(kunci: K, nilai: Form[K]) {
    setForm((f) => ({ ...f, [kunci]: nilai }));
  }

  function ubahVarian(i: number, nilai: Partial<FormVarian>) {
    setVarian((v) => v.map((row, j) => (j === i ? { ...row, ...nilai } : row)));
  }

  function tambahVarian() {
    setVarian((v) => [
      ...v,
      { warna: "indigo", ukuran: "M", sku: "", harga_beli: "0", aktif: true },
    ]);
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalatField({});
    setGalatUmum("");
    if (varian.some((v) => !v.sku.trim())) {
      setGalatField({ varian: "SKU varian wajib diisi." });
      return;
    }
    setProses(true);
    const body = {
      nama: form.nama,
      slug: form.slug,
      kategori: Number(form.kategori),
      teknik: form.teknik,
      motif: form.motif,
      bentuk: form.bentuk,
      warna_utama: form.warna_utama,
      koleksi: form.koleksi,
      perajin: form.perajin,
      deskripsi: form.deskripsi,
      bahan_detail: form.bahan_detail,
      perawatan: form.perawatan,
      cerita_judul: form.cerita_judul,
      cerita_isi: form.cerita_isi,
      harga: Number(form.harga),
      unggulan: form.unggulan,
      aktif: form.aktif,
    };
    try {
      let id = produk?.id;
      if (id) {
        await api(`/katalog/kelola/produk/${id}/`, { method: "PATCH", body });
      } else {
        const baru = await api<ProdukAdmin>("/katalog/kelola/produk/", { method: "POST", body });
        id = baru.id;
      }
      for (const v of varian) {
        const isi = {
          warna: v.warna,
          ukuran: v.ukuran,
          sku: v.sku.trim(),
          harga_beli: Number(v.harga_beli),
          aktif: v.aktif,
        };
        if (v.id) {
          await api(`/katalog/kelola/varian/${v.id}/`, { method: "PATCH", body: isi });
        } else {
          await api(`/katalog/kelola/produk/${id}/varian/`, { method: "POST", body: isi });
        }
      }
      // Varian yang dihapus dari form dinonaktifkan, bukan dihapus permanen.
      const tersisa = new Set(varian.map((v) => v.id).filter((x): x is number => x !== undefined));
      for (const lama of produk?.varian ?? []) {
        if (!tersisa.has(lama.id)) {
          await api(`/katalog/kelola/varian/${lama.id}/`, {
            method: "PATCH",
            body: { aktif: false },
          });
        }
      }
      await onBerhasil(produk ? "Produk diperbarui." : "Produk ditambahkan.");
    } catch (err) {
      setGalatField(galatPerField(err));
      setGalatUmum(pesanAksi(err));
    } finally {
      setProses(false);
    }
  }

  function pilihBerkas(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setUnggahan((u) => [
      ...u,
      ...files.map((file, i) => ({ file, alt: "", urutan: String(foto.length + u.length + i) })),
    ]);
    e.target.value = "";
  }

  async function unggahFoto() {
    if (!produk?.id || unggahan.length === 0) return;
    setProses(true);
    setGalatFoto("");
    setPesanFoto("");
    try {
      const hasil: FotoAdmin[] = [];
      for (const u of unggahan) {
        const fd = new FormData();
        fd.append("gambar", u.file);
        fd.append("jenis", "depan");
        fd.append("alt", u.alt);
        fd.append("urutan", u.urutan);
        hasil.push(
          await api<FotoAdmin>(`/katalog/kelola/produk/${produk.id}/foto/`, {
            method: "POST",
            body: fd,
          }),
        );
      }
      setFoto((f) => [...f, ...hasil]);
      setUnggahan([]);
      setPesanFoto(`${hasil.length} foto diunggah.`);
    } catch (err) {
      setGalatFoto(pesanAksi(err) || "Gagal mengunggah foto.");
    } finally {
      setProses(false);
    }
  }

  async function hapusFoto(id: number) {
    setProses(true);
    setGalatFoto("");
    try {
      await api(`/katalog/kelola/foto/${id}/`, { method: "DELETE" });
      setFoto((f) => f.filter((x) => x.id !== id));
    } catch (err) {
      setGalatFoto(pesanAksi(err) || "Gagal menghapus foto.");
    } finally {
      setProses(false);
    }
  }

  const kolom = (label: string, isi: React.ReactNode) => (
    <label className="block">
      <span className={`block ${LABEL_KOLOM}`}>{label}</span>
      {isi}
    </label>
  );

  return (
    <ModalDasbor terbuka judul={produk ? `Ubah ${produk.nama}` : "Tambah produk"} onTutup={onTutup}>
      <form onSubmit={simpan} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {kolom(
            "Nama",
            <Input value={form.nama} onChange={(e) => ubah("nama", e.target.value)} required />,
          )}
          {kolom(
            "Slug",
            <Input value={form.slug} onChange={(e) => ubah("slug", e.target.value)} required />,
          )}
          {kolom(
            "Kategori",
            <select
              className="input-dasbor"
              value={form.kategori}
              onChange={(e) => ubah("kategori", e.target.value)}
              required
            >
              <option value="">Pilih kategori</option>
              {kategori.map((k) => (
                <option key={k.id} value={String(k.id)}>{k.nama}</option>
              ))}
            </select>,
          )}
          {kolom(
            "Motif",
            <select
              className="input-dasbor"
              value={form.motif}
              onChange={(e) => ubah("motif", e.target.value)}
              required
            >
              <option value="">Pilih motif</option>
              {motif.map((m) => (
                <option key={m.id} value={m.slug}>{m.nama}</option>
              ))}
            </select>,
          )}
          {kolom(
            "Teknik",
            <select
              className="input-dasbor"
              value={form.teknik}
              onChange={(e) => ubah("teknik", e.target.value as ProdukAdmin["teknik"])}
            >
              {TEKNIK.map(([nilai, label]) => (
                <option key={nilai} value={nilai}>{label}</option>
              ))}
            </select>,
          )}
          {kolom(
            "Bentuk",
            <select
              className="input-dasbor"
              value={form.bentuk}
              onChange={(e) => ubah("bentuk", e.target.value)}
            >
              {BENTUK.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>,
          )}
          {kolom(
            "Warna utama",
            <select
              className="input-dasbor"
              value={form.warna_utama}
              onChange={(e) => ubah("warna_utama", e.target.value as ProdukAdmin["warna_utama"])}
            >
              {WARNA.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>,
          )}
          {kolom(
            "Harga jual (Rupiah)",
            <Input
              type="number"
              min={0}
              value={form.harga}
              onChange={(e) => ubah("harga", e.target.value)}
              required
            />,
          )}
          {kolom(
            "Koleksi",
            <Input value={form.koleksi} onChange={(e) => ubah("koleksi", e.target.value)} />,
          )}
          {kolom(
            "Perajin",
            <Input value={form.perajin} onChange={(e) => ubah("perajin", e.target.value)} />,
          )}
        </div>

        <div className="grid gap-3">
          {kolom(
            "Deskripsi",
            <textarea
              className="input-dasbor min-h-20"
              value={form.deskripsi}
              onChange={(e) => ubah("deskripsi", e.target.value)}
            />,
          )}
          {kolom(
            "Bahan",
            <textarea
              className="input-dasbor min-h-16"
              value={form.bahan_detail}
              onChange={(e) => ubah("bahan_detail", e.target.value)}
            />,
          )}
          {kolom(
            "Perawatan",
            <textarea
              className="input-dasbor min-h-16"
              value={form.perawatan}
              onChange={(e) => ubah("perawatan", e.target.value)}
            />,
          )}
          {kolom(
            "Cerita judul",
            <Input value={form.cerita_judul} onChange={(e) => ubah("cerita_judul", e.target.value)} />,
          )}
          {kolom(
            "Cerita isi",
            <textarea
              className="input-dasbor min-h-20"
              value={form.cerita_isi}
              onChange={(e) => ubah("cerita_isi", e.target.value)}
            />,
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-[12px]">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.unggulan}
              onChange={(e) => ubah("unggulan", e.target.checked)}
            />
            Pilihan Mankota
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.aktif}
              onChange={(e) => ubah("aktif", e.target.checked)}
            />
            Aktif (tampil di katalog)
          </label>
        </div>

        <section aria-labelledby="judul-varian-form">
          <div className="flex items-center justify-between">
            <h3 id="judul-varian-form" className="font-sans text-[12.5px] font-semibold">Varian</h3>
            <Button type="button" variant="outline" size="sm" onClick={tambahVarian}>
              Tambah varian
            </Button>
          </div>
          {galatField.varian && <ErrorState pesan={galatField.varian} />}
          {varian.length === 0 ? (
            <p className="py-3 text-[11.5px] text-dash-text-muted">Belum ada varian.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {varian.map((v, i) => (
                <div key={v.id ?? `baru-${i}`} className="grid gap-2 rounded-md border border-dash-border p-2 sm:grid-cols-6">
                  <div className="sm:col-span-2">
                    <Input
                      aria-label="SKU"
                      placeholder="SKU"
                      value={v.sku}
                      onChange={(e) => ubahVarian(i, { sku: e.target.value })}
                      required
                    />
                    {galatField.sku && <span role="alert" className="galat-dasbor">{galatField.sku}</span>}
                  </div>
                  <select
                    aria-label="Warna"
                    className="input-dasbor"
                    value={v.warna}
                    onChange={(e) => ubahVarian(i, { warna: e.target.value as VarianAdmin["warna"] })}
                  >
                    {WARNA.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Ukuran"
                    className="input-dasbor"
                    value={v.ukuran}
                    onChange={(e) => ubahVarian(i, { ukuran: e.target.value as VarianAdmin["ukuran"] })}
                  >
                    {UKURAN.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <Input
                    aria-label="Harga beli"
                    type="number"
                    min={0}
                    placeholder="Harga beli"
                    value={v.harga_beli}
                    onChange={(e) => ubahVarian(i, { harga_beli: e.target.value })}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1 text-[11px]">
                      <input
                        type="checkbox"
                        checked={v.aktif}
                        onChange={(e) => ubahVarian(i, { aktif: e.target.checked })}
                      />
                      Aktif
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => setVarian((rows) => rows.filter((_, j) => j !== i))}
                    >
                      Hapus
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="judul-foto-form">
          <h3 id="judul-foto-form" className="font-sans text-[12.5px] font-semibold">Foto produk</h3>
          {!produk ? (
            <p className="py-2 text-[11.5px] text-dash-text-muted">
              Simpan produk dulu untuk mengunggah foto.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {foto.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {foto.map((f) => (
                    <div key={f.id} className="w-24 rounded-md border border-dash-border p-1">
                      {f.url ? (
                        <img src={f.url} alt={f.alt || "Foto produk"} className="h-20 w-full object-cover" />
                      ) : (
                        <div className="flex h-20 items-center justify-center text-[10px] text-dash-text-muted">
                          Tanpa gambar
                        </div>
                      )}
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span className="text-dash-text-muted">#{f.urutan}</span>
                        <button
                          type="button"
                          className="text-dash-text-muted underline"
                          onClick={() => hapusFoto(f.id)}
                          disabled={proses}
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                aria-label="Pilih foto"
                className="block text-[11.5px]"
                onChange={pilihBerkas}
              />
              {unggahan.map((u, i) => (
                <div key={`${u.file.name}-${i}`} className="grid gap-2 sm:grid-cols-5">
                  <span className="truncate text-[11px] sm:col-span-2">{u.file.name}</span>
                  <Input
                    aria-label={`Teks alternatif ${u.file.name}`}
                    placeholder="Teks alternatif"
                    value={u.alt}
                    onChange={(e) =>
                      setUnggahan((rows) => rows.map((r, j) => (j === i ? { ...r, alt: e.target.value } : r)))
                    }
                  />
                  <Input
                    aria-label={`Urutan ${u.file.name}`}
                    type="number"
                    min={0}
                    value={u.urutan}
                    onChange={(e) =>
                      setUnggahan((rows) => rows.map((r, j) => (j === i ? { ...r, urutan: e.target.value } : r)))
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setUnggahan((rows) => rows.filter((_, j) => j !== i))}
                  >
                    Batal
                  </Button>
                </div>
              ))}
              {unggahan.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={unggahFoto} disabled={proses}>
                  Unggah {unggahan.length} foto
                </Button>
              )}
              {galatFoto && <ErrorState pesan={galatFoto} />}
              {pesanFoto && <p role="status" className="text-[11px] text-dash-text-muted">{pesanFoto}</p>}
            </div>
          )}
        </section>

        {galatUmum && <ErrorState pesan={galatUmum} />}
        {Object.entries(galatField)
          .filter(([k]) => k !== "sku" && k !== "varian")
          .map(([k, v]) => (
            <p key={k} role="alert" className="galat-dasbor">{k}: {v}</p>
          ))}

        <div className="flex justify-end gap-2 border-t border-dash-border pt-3">
          <Button type="button" variant="outline" onClick={onTutup}>
            Batal
          </Button>
          <Button type="submit" disabled={proses}>
            {proses ? "Menyimpan..." : "Simpan produk"}
          </Button>
        </div>
        {produk && (
          <p className="text-right text-[10.5px] text-dash-text-muted">
            Harga jual produk: {rupiah(produk.harga)}
          </p>
        )}
      </form>
    </ModalDasbor>
  );
}
