"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, api } from "@/lib/api";
import type { BarisAudit, HalamanAudit } from "@/types/skema";

import { Galat, Kosong, Memuat } from "./keadaan";

const LABEL_AKSI: Record<BarisAudit["action"], string> = {
  price_change: "Ubah harga",
  stock_adjust: "Penyesuaian stok",
  void_return: "Void/retur",
  role_change: "Ubah role",
  admin_login: "Login admin",
  otp_reset: "Reset 2FA",
};

// Sama dengan AuditPagination.page_size di backend.
const PER_HALAMAN = 50;

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
  const [total, setTotal] = useState(0);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [pelaku, setPelaku] = useState("");
  const [aksi, setAksi] = useState("");
  const [halaman, setHalaman] = useState(1);

  useEffect(() => {
    let batal = false;
    let sudahPindah = false;
    (async () => {
      setMemuat(true);
      setGalat("");
      try {
        const q = new URLSearchParams({ page: String(halaman) });
        if (tanggal) {
          q.set("dari", tanggal);
          q.set("sampai", tanggal);
        }
        if (pelaku) q.set("pelaku", pelaku);
        if (aksi) q.set("aksi", aksi);
        const data = await api<HalamanAudit>(`/audit/?${q}`);
        if (batal) return;
        setBaris(data.results);
        setTotal(data.count);
      } catch (err) {
        if (batal) return;
        if (err instanceof ApiError && err.status === 403) {
          router.replace("/verifikasi-2fa");
          return;
        }
        // Halaman di luar jangkauan setelah filter menyempit: ulang dari halaman 1.
        if (err instanceof ApiError && err.status === 404 && halaman > 1) {
          sudahPindah = true;
          setHalaman(1);
          return;
        }
        setGalat("Gagal memuat audit log.");
      } finally {
        if (!batal && !sudahPindah) setMemuat(false);
      }
    })();
    return () => {
      batal = true;
    };
  }, [router, halaman, tanggal, pelaku, aksi]);

  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const halamanAman = Math.min(halaman, totalHalaman);

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
        {memuat ? (
          <Memuat />
        ) : galat ? (
          <Galat pesan={galat} />
        ) : total === 0 ? (
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
                  {baris.map((b) => (
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
                {total} baris · halaman {halamanAman} dari {totalHalaman}
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
