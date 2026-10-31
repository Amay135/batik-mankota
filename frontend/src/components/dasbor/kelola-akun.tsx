"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, api, galatPerField, pesanGalat } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Akun, AkunBaru, Role } from "@/types/skema";

import { DialogKonfirmasi } from "./dialog-konfirmasi";
import { EmptyState, ErrorState, Memuat } from "./keadaan";

type Dialog =
  | { jenis: "ubah"; akun: Akun }
  | { jenis: "sandi"; akun: Akun }
  | { jenis: "status"; akun: Akun }
  | null;

const AKUN_BARU: AkunBaru = { email: "", password: "", nama_lengkap: "", whatsapp: "", role: "kasir" };
const LABEL_ROLE: Record<Exclude<Role, "user">, string> = { admin: "Admin", kasir: "Kasir" };
const LABEL_KOLOM = "mb-1.5 block text-[11px] text-dash-text-muted";

export function KelolaAkun() {
  const router = useRouter();
  const [daftar, setDaftar] = useState<Akun[] | null>(null);
  const [galatMuat, setGalatMuat] = useState("");
  const [baru, setBaru] = useState<AkunBaru>(AKUN_BARU);
  const [galatBaru, setGalatBaru] = useState<Record<string, string>>({});
  const [umumBaru, setUmumBaru] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [ubahData, setUbahData] = useState({ nama_lengkap: "", whatsapp: "", role: "kasir" as Exclude<Role, "user"> });
  const [sandi, setSandi] = useState("");
  const [galatDialog, setGalatDialog] = useState("");
  const [proses, setProses] = useState(false);

  const muat = useCallback(async () => {
    try {
      setDaftar(await api<Akun[]>("/auth/akun/"));
      setGalatMuat("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        router.replace("/verifikasi-2fa");
        return;
      }
      setGalatMuat("Gagal memuat daftar akun.");
    }
  }, [router]);

  useEffect(() => {
    void muat();
  }, [muat]);

  function pesan(err: unknown) {
    if (err instanceof ApiError && err.status === 403) {
      router.replace("/verifikasi-2fa");
      return "";
    }
    return pesanGalat(err instanceof ApiError ? err.data : null) || "Terjadi kesalahan. Coba lagi.";
  }

  async function tambah(e: React.FormEvent) {
    e.preventDefault();
    setProses(true);
    setGalatBaru({});
    setUmumBaru("");
    try {
      await api("/auth/akun/", { method: "POST", body: { ...baru, whatsapp: baru.whatsapp || undefined } });
      setBaru(AKUN_BARU);
      await muat();
    } catch (err) {
      setGalatBaru(galatPerField(err));
      setUmumBaru(pesan(err));
    } finally {
      setProses(false);
    }
  }

  function bukaUbah(a: Akun) {
    setUbahData({ nama_lengkap: a.nama_lengkap, whatsapp: a.whatsapp, role: a.role });
    setGalatDialog("");
    setDialog({ jenis: "ubah", akun: a });
  }

  async function konfirmasi() {
    if (!dialog) return;
    setProses(true);
    setGalatDialog("");
    try {
      if (dialog.jenis === "ubah") {
        await api(`/auth/akun/${dialog.akun.id}/`, { method: "PATCH", body: ubahData });
      } else if (dialog.jenis === "sandi") {
        await api(`/auth/akun/${dialog.akun.id}/reset-password/`, { method: "POST", body: { password: sandi } });
      } else {
        await api(`/auth/akun/${dialog.akun.id}/`, { method: "PATCH", body: { is_active: !dialog.akun.is_active } });
      }
      setSandi("");
      setDialog(null);
      await muat();
    } catch (err) {
      setGalatDialog(Object.values(galatPerField(err))[0] ?? pesan(err));
    } finally {
      setProses(false);
    }
  }

  const jenis = dialog?.jenis;
  const judulDialog = jenis === "ubah" ? "Ubah akun" : jenis === "sandi" ? "Reset kata sandi" : "Ubah status akun";
  const labelKonfirmasi =
    jenis === "sandi" ? "Reset" : jenis === "status" ? (dialog?.akun.is_active ? "Nonaktifkan" : "Aktifkan") : "Simpan";

  const kolom = (kunci: keyof AkunBaru, label: string, tipe = "text") => (
    <div className="block">
      <Label htmlFor={`akun-baru-${kunci}`} className={LABEL_KOLOM}>
        {label}
      </Label>
      <Input
        id={`akun-baru-${kunci}`}
        type={tipe}
        value={baru[kunci] ?? ""}
        onChange={(e) => setBaru((s) => ({ ...s, [kunci]: e.target.value }))}
        required={kunci !== "whatsapp"}
      />
      {galatBaru[kunci] && <span role="alert" className="galat-dasbor">{galatBaru[kunci]}</span>}
    </div>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Akun</h1>
        <p className="mt-1 text-[12px] text-dash-text-muted">
          Kelola akun kasir dan admin. Akun pelanggan tidak tampil di sini.
        </p>
      </header>

      <section className="panel-dasbor" aria-labelledby="judul-tambah">
        <h2 id="judul-tambah" className="font-sans text-[13px] font-semibold">Tambah akun</h2>
        <form onSubmit={tambah} className="mt-4 grid gap-3 sm:grid-cols-2">
          {kolom("nama_lengkap", "Nama lengkap")}
          {kolom("email", "Email", "email")}
          {kolom("password", "Kata sandi", "password")}
          {kolom("whatsapp", "Nomor WhatsApp (opsional)", "tel")}
          <div className="block">
            <Label htmlFor="akun-baru-role" className={LABEL_KOLOM}>Role</Label>
            <select
              id="akun-baru-role"
              className="input-dasbor"
              value={baru.role}
              onChange={(e) => setBaru((s) => ({ ...s, role: e.target.value as Exclude<Role, "user"> }))}
            >
              <option value="kasir">Kasir</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={proses}>
              {proses ? "Menyimpan..." : "Tambah akun"}
            </Button>
            {umumBaru && <ErrorState pesan={umumBaru} />}
          </div>
        </form>
      </section>

      <section className="panel-dasbor" aria-labelledby="judul-daftar">
        <h2 id="judul-daftar" className="font-sans text-[13px] font-semibold">Daftar akun</h2>
        {daftar === null ? (
          galatMuat ? <ErrorState pesan={galatMuat} /> : <Memuat />
        ) : daftar.length === 0 ? (
          <EmptyState pesan="Belum ada akun kasir atau admin." />
        ) : (
          <div className="mt-3">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Email</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>2FA</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daftar.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.email}</TableCell>
                    <TableCell>
                      {a.nama_lengkap || "—"}
                      {a.whatsapp && <span className="block text-[10.5px] text-dash-text-muted">{a.whatsapp}</span>}
                    </TableCell>
                    <TableCell>{LABEL_ROLE[a.role]}</TableCell>
                    <TableCell>
                      <span className={`lencana ${a.is_active ? "lencana-utama" : "lencana-redup"}`}>
                        {a.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`lencana ${a.otp_enabled ? "lencana-utama" : "lencana-redup"}`}>
                        {a.otp_enabled ? "Aktif" : "Belum"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-[11.5px]"
                          onClick={() => bukaUbah(a)}
                        >
                          Ubah
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-[11.5px]"
                          onClick={() => {
                            setSandi("");
                            setGalatDialog("");
                            setDialog({ jenis: "sandi", akun: a });
                          }}
                        >
                          Reset sandi
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-[11.5px]"
                          onClick={() => {
                            setGalatDialog("");
                            setDialog({ jenis: "status", akun: a });
                          }}
                        >
                          {a.is_active ? "Nonaktifkan" : "Aktifkan"}
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
        judul={judulDialog}
        labelKonfirmasi={labelKonfirmasi}
        proses={proses}
        onBatal={() => setDialog(null)}
        onKonfirmasi={konfirmasi}
      >
        {jenis === "ubah" && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="dialog-ubah-nama" className={LABEL_KOLOM}>Nama lengkap</Label>
              <Input
                id="dialog-ubah-nama"
                value={ubahData.nama_lengkap}
                onChange={(e) => setUbahData((s) => ({ ...s, nama_lengkap: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="dialog-ubah-wa" className={LABEL_KOLOM}>Nomor WhatsApp</Label>
              <Input
                id="dialog-ubah-wa"
                value={ubahData.whatsapp}
                onChange={(e) => setUbahData((s) => ({ ...s, whatsapp: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="dialog-ubah-role" className={LABEL_KOLOM}>Role</Label>
              <select
                id="dialog-ubah-role"
                className="input-dasbor"
                value={ubahData.role}
                onChange={(e) => setUbahData((s) => ({ ...s, role: e.target.value as Exclude<Role, "user"> }))}
              >
                <option value="kasir">Kasir</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        )}
        {jenis === "sandi" && (
          <div>
            <Label htmlFor="dialog-sandi" className={LABEL_KOLOM}>Kata sandi baru</Label>
            <Input
              id="dialog-sandi"
              type="password"
              value={sandi}
              onChange={(e) => setSandi(e.target.value)}
              required
            />
          </div>
        )}
        {jenis === "status" && (
          <p>
            Akun <b>{dialog?.akun.email}</b> akan {dialog?.akun.is_active ? "dinonaktifkan" : "diaktifkan"}.
          </p>
        )}
        {galatDialog && <ErrorState pesan={galatDialog} />}
      </DialogKonfirmasi>
    </div>
  );
}
