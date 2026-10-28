"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, api, galatPerField, pesanGalat } from "@/lib/api";
import type { Akun, AkunBaru, Role } from "@/types/skema";

import { DialogKonfirmasi } from "./dialog-konfirmasi";
import { Galat, Kosong, Memuat } from "./keadaan";

type Dialog =
  | { jenis: "ubah"; akun: Akun }
  | { jenis: "sandi"; akun: Akun }
  | { jenis: "status"; akun: Akun }
  | null;

const AKUN_BARU: AkunBaru = { email: "", password: "", nama_lengkap: "", whatsapp: "", role: "kasir" };
const LABEL_ROLE: Record<Exclude<Role, "user">, string> = { admin: "Admin", kasir: "Kasir" };

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
    <label className="block">
      <span className="label-dasbor">{label}</span>
      <input
        className="input-dasbor"
        type={tipe}
        value={baru[kunci] ?? ""}
        onChange={(e) => setBaru((s) => ({ ...s, [kunci]: e.target.value }))}
        required={kunci !== "whatsapp"}
      />
      {galatBaru[kunci] && <span role="alert" className="galat-dasbor">{galatBaru[kunci]}</span>}
    </label>
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
          <label className="block">
            <span className="label-dasbor">Role</span>
            <select
              className="input-dasbor"
              value={baru.role}
              onChange={(e) => setBaru((s) => ({ ...s, role: e.target.value as Exclude<Role, "user"> }))}
            >
              <option value="kasir">Kasir</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button type="submit" className="tombol-utama" disabled={proses}>
              {proses ? "Menyimpan..." : "Tambah akun"}
            </button>
            {umumBaru && <Galat pesan={umumBaru} />}
          </div>
        </form>
      </section>

      <section className="panel-dasbor" aria-labelledby="judul-daftar">
        <h2 id="judul-daftar" className="font-sans text-[13px] font-semibold">Daftar akun</h2>
        {daftar === null ? (
          galatMuat ? <Galat pesan={galatMuat} /> : <Memuat />
        ) : daftar.length === 0 ? (
          <Kosong pesan="Belum ada akun kasir atau admin." />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="tabel-dasbor">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nama</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>2FA</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((a) => (
                  <tr key={a.id}>
                    <td>{a.email}</td>
                    <td>
                      {a.nama_lengkap || "—"}
                      {a.whatsapp && <span className="block text-[10.5px] text-dash-text-muted">{a.whatsapp}</span>}
                    </td>
                    <td>{LABEL_ROLE[a.role]}</td>
                    <td>
                      <span className={`lencana ${a.is_active ? "lencana-utama" : "lencana-redup"}`}>
                        {a.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td>
                      <span className={`lencana ${a.otp_enabled ? "lencana-utama" : "lencana-redup"}`}>
                        {a.otp_enabled ? "Aktif" : "Belum"}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button type="button" className="tombol-sekunder h-8 px-2.5 text-[11.5px]" onClick={() => bukaUbah(a)}>
                          Ubah
                        </button>
                        <button
                          type="button"
                          className="tombol-sekunder h-8 px-2.5 text-[11.5px]"
                          onClick={() => {
                            setSandi("");
                            setGalatDialog("");
                            setDialog({ jenis: "sandi", akun: a });
                          }}
                        >
                          Reset sandi
                        </button>
                        <button
                          type="button"
                          className="tombol-sekunder h-8 px-2.5 text-[11.5px]"
                          onClick={() => {
                            setGalatDialog("");
                            setDialog({ jenis: "status", akun: a });
                          }}
                        >
                          {a.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            <label className="block">
              <span className="label-dasbor">Nama lengkap</span>
              <input
                className="input-dasbor"
                value={ubahData.nama_lengkap}
                onChange={(e) => setUbahData((s) => ({ ...s, nama_lengkap: e.target.value }))}
                required
              />
            </label>
            <label className="block">
              <span className="label-dasbor">Nomor WhatsApp</span>
              <input
                className="input-dasbor"
                value={ubahData.whatsapp}
                onChange={(e) => setUbahData((s) => ({ ...s, whatsapp: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="label-dasbor">Role</span>
              <select
                className="input-dasbor"
                value={ubahData.role}
                onChange={(e) => setUbahData((s) => ({ ...s, role: e.target.value as Exclude<Role, "user"> }))}
              >
                <option value="kasir">Kasir</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>
        )}
        {jenis === "sandi" && (
          <label className="block">
            <span className="label-dasbor">Kata sandi baru</span>
            <input className="input-dasbor" type="password" value={sandi} onChange={(e) => setSandi(e.target.value)} required />
          </label>
        )}
        {jenis === "status" && (
          <p>
            Akun <b>{dialog?.akun.email}</b> akan {dialog?.akun.is_active ? "dinonaktifkan" : "diaktifkan"}.
          </p>
        )}
        {galatDialog && <Galat pesan={galatDialog} />}
      </DialogKonfirmasi>
    </div>
  );
}
