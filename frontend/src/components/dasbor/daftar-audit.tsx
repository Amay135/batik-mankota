"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, api } from "@/lib/api";
import { muatSemuaAudit } from "@/lib/audit";
import type { BarisAudit, HalamanAudit } from "@/types/skema";

import { Galat, Kosong, Memuat } from "./keadaan";

const LABEL_AKSI: Record<BarisAudit["action"], string> = {
  price_change: "Ubah harga",
  stock_adjust: "Penyesuaian stok",
  void_return: "Void/retur",
  role_change: "Ubah role",
  admin_login: "Login admin",
};

const PER_HALAMAN = 50;

function tanggalJakarta(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function waktuJakarta(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  });
}

function rincian(nilai: unknown) {
  if (nilai === null || nilai === undefined || (typeof nilai === "object" && Object.keys(nilai).length === 0)) return "—";
  return JSON.stringify(nilai);
}

export function DaftarAudit() {
  const router = useRouter();
  const [baris, setBaris] = useState<BarisAudit[]>([]);
  const [terpotong, setTerpotong] = useState(false);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [pelaku, setPelaku] = useState("");
  const [aksi, setAksi] = useState("");
  const [halaman, setHalaman] = useState(1);

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const hasil = await muatSemuaAudit((h) => api<HalamanAudit>(`/audit/?page=${h}`));
        if (batal) return;
        setBaris(hasil.baris);
        setTerpotong(hasil.terpotong);
      } catch (err) {
        if (batal) return;
        if (err instanceof ApiError && err.status === 403) {
          router.replace("/verifikasi-2fa");
          return;
        }
        setGalat("Gagal memuat audit log.");
      } finally {
        if (!batal) setMemuat(false);
      }
    })();
    return () => {
      batal = true;
    };
  }, [router]);

  const hasil = baris.filter(
    (b) =>
      (!tanggal || tanggalJakarta(b.created_at) === tanggal) &&
      (!pelaku || b.actor_email.toLowerCase().includes(pelaku.toLowerCase())) &&
      (!aksi || b.action === aksi),
  );

  const totalHalaman = Math.max(1, Math.ceil(hasil.length / PER_HALAMAN));
  const halamanAman = Math.min(halaman, totalHalaman);
  const tampil = hasil.slice((halamanAman - 1) * PER_HALAMAN, halamanAman * PER_HALAMAN);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Log Audit</h1>
        <p className="mt-1 text-[12px] text-dash-text-muted">
          Riwayat tindakan sensitif. Hanya baca; audit tidak dapat diubah atau dihapus.
        </p>
      </header>

      <section className="panel-dasbor" aria-label="Filter log audit">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="label-dasbor">Tanggal (WIB)</span>
            <input
              className="input-dasbor"
              type="date"
              value={tanggal}
              onChange={(e) => {
                setTanggal(e.target.value);
                setHalaman(1);
              }}
            />
          </label>
          <label className="block">
            <span className="label-dasbor">Pelaku</span>
            <input
              className="input-dasbor"
              type="search"
              placeholder="Email pelaku"
              value={pelaku}
              onChange={(e) => {
                setPelaku(e.target.value);
                setHalaman(1);
              }}
            />
          </label>
          <label className="block">
            <span className="label-dasbor">Aksi</span>
            <select
              className="input-dasbor"
              value={aksi}
              onChange={(e) => {
                setAksi(e.target.value);
                setHalaman(1);
              }}
            >
              <option value="">Semua aksi</option>
              {Object.entries(LABEL_AKSI).map(([nilai, label]) => (
                <option key={nilai} value={nilai}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="panel-dasbor" aria-labelledby="judul-audit">
        <h2 id="judul-audit" className="font-sans text-[13px] font-semibold">Audit log</h2>
        {terpotong && (
          <p role="status" className="mt-2 rounded-md border border-dash-star px-3 py-2 text-[11.5px]">
            Data dipotong, persempit filter
          </p>
        )}
        {memuat ? (
          <Memuat />
        ) : galat ? (
          <Galat pesan={galat} />
        ) : hasil.length === 0 ? (
          <Kosong pesan="Tidak ada audit log yang cocok dengan filter." />
        ) : (
          <>
            <div className="mt-3 overflow-x-auto">
              <table className="tabel-dasbor">
                <thead>
                  <tr>
                    <th>Waktu (WIB)</th>
                    <th>Pelaku</th>
                    <th>Aksi</th>
                    <th>Entitas</th>
                    <th>IP</th>
                    <th>Rincian</th>
                  </tr>
                </thead>
                <tbody>
                  {tampil.map((b) => (
                    <tr key={b.id}>
                      <td className="whitespace-nowrap">{waktuJakarta(b.created_at)}</td>
                      <td>{b.actor_email}</td>
                      <td>{LABEL_AKSI[b.action] ?? b.action}</td>
                      <td>
                        {b.entity || "—"}
                        {b.entity_id && <span className="block text-[10.5px] text-dash-text-muted">#{b.entity_id}</span>}
                      </td>
                      <td>{b.ip ?? "—"}</td>
                      <td>
                        <details>
                          <summary className="cursor-pointer">Lihat</summary>
                          <pre className="mt-1 max-w-[280px] whitespace-pre-wrap break-all text-[10.5px] text-dash-text-muted">
                            Sebelum: {rincian(b.before)}
                            {"\n"}Sesudah: {rincian(b.after)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11.5px] text-dash-text-muted">
              <span>
                {hasil.length} baris · halaman {halamanAman} dari {totalHalaman}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="tombol-sekunder h-8 px-3 text-[11.5px]"
                  onClick={() => setHalaman((h) => Math.max(1, h - 1))}
                  disabled={halamanAman === 1}
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  className="tombol-sekunder h-8 px-3 text-[11.5px]"
                  onClick={() => setHalaman((h) => Math.min(totalHalaman, h + 1))}
                  disabled={halamanAman === totalHalaman}
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
