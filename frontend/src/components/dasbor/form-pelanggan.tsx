"use client";

import { useState } from "react";

import { api, galatPerField, pesanAksi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Pelanggan } from "@/types/skema";

import { ModalDasbor } from "./modal-dasbor";
import { ErrorState } from "./keadaan";

const LABEL_KOLOM = "mb-1.5 block text-[11px] text-dash-text-muted";

type Isian = {
  nama: string;
  telepon: string;
  email: string;
  alamat: string;
  catatan: string;
};

type Props = {
  pelanggan: Pelanggan | null;
  onTutup: () => void;
  onBerhasil: (pesan: string) => Promise<void>;
};

/** Form tambah/ubah pelanggan; validasi utama tetap di backend. */
export function FormPelanggan({ pelanggan, onTutup, onBerhasil }: Props) {
  const [form, setForm] = useState<Isian>(() => ({
    nama: pelanggan?.nama ?? "",
    telepon: pelanggan?.telepon ?? "",
    email: pelanggan?.email ?? "",
    alamat: pelanggan?.alamat ?? "",
    catatan: pelanggan?.catatan ?? "",
  }));
  const [galatField, setGalatField] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState("");
  const [proses, setProses] = useState(false);

  function ubah(kunci: keyof Isian, nilai: string) {
    setForm((f) => ({ ...f, [kunci]: nilai }));
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalatField({});
    setGalatUmum("");
    if (!form.nama.trim()) {
      setGalatField({ nama: "Nama pelanggan wajib diisi." });
      return;
    }
    setProses(true);
    const body = {
      nama: form.nama.trim(),
      telepon: form.telepon.trim(),
      email: form.email.trim(),
      alamat: form.alamat.trim(),
      catatan: form.catatan.trim(),
    };
    try {
      if (pelanggan) {
        await api(`/pelanggan/${pelanggan.id}/`, { method: "PATCH", body });
      } else {
        await api("/pelanggan/", { method: "POST", body });
      }
      await onBerhasil(
        pelanggan ? "Perubahan pelanggan disimpan." : "Pelanggan baru ditambahkan.",
      );
    } catch (err) {
      const perField = galatPerField(err);
      setGalatField(perField);
      if (Object.keys(perField).length === 0) {
        setGalatUmum(pesanAksi(err) || "Gagal menyimpan pelanggan.");
      }
    } finally {
      setProses(false);
    }
  }

  return (
    <ModalDasbor
      terbuka
      judul={pelanggan ? "Ubah pelanggan" : "Tambah pelanggan"}
      onTutup={onTutup}
    >
      <form onSubmit={simpan} className="space-y-4">
        <div>
          <Label htmlFor="pelanggan-nama" className={LABEL_KOLOM}>
            Nama pelanggan
          </Label>
          <Input
            id="pelanggan-nama"
            value={form.nama}
            onChange={(e) => ubah("nama", e.target.value)}
            placeholder="Nama lengkap pelanggan"
            required
            autoFocus
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="pelanggan-telepon" className={LABEL_KOLOM}>
              Nomor telepon
            </Label>
            <Input
              id="pelanggan-telepon"
              type="tel"
              inputMode="tel"
              value={form.telepon}
              onChange={(e) => ubah("telepon", e.target.value)}
              placeholder="0812xxxxxxx (opsional)"
            />
          </div>
          <div>
            <Label htmlFor="pelanggan-email" className={LABEL_KOLOM}>
              Email
            </Label>
            <Input
              id="pelanggan-email"
              type="email"
              value={form.email}
              onChange={(e) => ubah("email", e.target.value)}
              placeholder="nama@email.com (opsional)"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="pelanggan-alamat" className={LABEL_KOLOM}>
            Alamat
          </Label>
          <Textarea
            id="pelanggan-alamat"
            value={form.alamat}
            onChange={(e) => ubah("alamat", e.target.value)}
            placeholder="Alamat pelanggan (opsional)"
            rows={2}
          />
        </div>
        <div>
          <Label htmlFor="pelanggan-catatan" className={LABEL_KOLOM}>
            Catatan
          </Label>
          <Textarea
            id="pelanggan-catatan"
            value={form.catatan}
            onChange={(e) => ubah("catatan", e.target.value)}
            placeholder="Catatan internal (opsional)"
            rows={2}
          />
        </div>

        {galatUmum && <ErrorState pesan={galatUmum} />}
        {Object.entries(galatField).map(([k, v]) => (
          <p key={k} role="alert" className="galat-dasbor">
            {k}: {v}
          </p>
        ))}

        <div className="flex justify-end gap-2 border-t border-dash-border pt-3">
          <Button type="button" variant="outline" onClick={onTutup} disabled={proses}>
            Batal
          </Button>
          <Button type="submit" disabled={proses}>
            {proses ? "Menyimpan..." : "Simpan pelanggan"}
          </Button>
        </div>
      </form>
    </ModalDasbor>
  );
}
