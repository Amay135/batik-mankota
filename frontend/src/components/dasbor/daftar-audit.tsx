"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";

import { ApiError, api } from "@/lib/api";
import { waktuJakarta } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BarisAudit, HalamanAudit } from "@/types/skema";

import { DataTable } from "./data-table";
import { EmptyState, ErrorState, Memuat } from "./keadaan";

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

const LABEL_KOLOM = "mb-1.5 block text-[11px] text-dash-text-muted";

function rincian(nilai: unknown) {
  if (nilai === null || nilai === undefined || (typeof nilai === "object" && Object.keys(nilai).length === 0)) return "—";
  return JSON.stringify(nilai);
}

const KOLOM: ColumnDef<BarisAudit, unknown>[] = [
  {
    id: "waktu",
    header: "Waktu (WIB)",
    cell: ({ row }) => <span className="whitespace-nowrap">{waktuJakarta(row.original.created_at)}</span>,
  },
  { id: "pelaku", header: "Pelaku", cell: ({ row }) => row.original.actor_email },
  {
    id: "aksi",
    header: "Aksi",
    cell: ({ row }) => LABEL_AKSI[row.original.action] ?? row.original.action,
  },
  {
    id: "entitas",
    header: "Entitas",
    cell: ({ row }) => (
      <>
        {row.original.entity || "—"}
        {row.original.entity_id && (
          <span className="block text-[10.5px] text-dash-text-muted">#{row.original.entity_id}</span>
        )}
      </>
    ),
  },
  { id: "ip", header: "IP", cell: ({ row }) => row.original.ip ?? "—" },
  {
    id: "rincian",
    header: "Rincian",
    cell: ({ row }) => (
      <details>
        <summary className="cursor-pointer">Lihat</summary>
        <pre className="mt-1 max-w-[280px] whitespace-pre-wrap break-all text-[10.5px] text-dash-text-muted">
          Sebelum: {rincian(row.original.before)}
          {"\n"}Sesudah: {rincian(row.original.after)}
        </pre>
      </details>
    ),
  },
];

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
          <div className="block">
            <Label htmlFor="filter-tanggal" className={LABEL_KOLOM}>Tanggal (WIB)</Label>
            <Input
              id="filter-tanggal"
              type="date"
              value={tanggal}
              onChange={(e) => {
                setTanggal(e.target.value);
                setHalaman(1);
              }}
            />
          </div>
          <div className="block">
            <Label htmlFor="filter-pelaku" className={LABEL_KOLOM}>Pelaku</Label>
            <Input
              id="filter-pelaku"
              type="search"
              placeholder="Email pelaku"
              value={pelaku}
              onChange={(e) => {
                setPelaku(e.target.value);
                setHalaman(1);
              }}
            />
          </div>
          <div className="block">
            <Label htmlFor="filter-aksi" className={LABEL_KOLOM}>Aksi</Label>
            <select
              id="filter-aksi"
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
          </div>
        </div>
      </section>

      <section className="panel-dasbor" aria-labelledby="judul-audit">
        <h2 id="judul-audit" className="font-sans text-[13px] font-semibold">Audit log</h2>
        {memuat ? (
          <Memuat />
        ) : galat ? (
          <ErrorState pesan={galat} />
        ) : total === 0 ? (
          <EmptyState pesan="Tidak ada audit log yang cocok dengan filter." />
        ) : (
          <div className="mt-3">
            <DataTable
              kolom={KOLOM}
              data={baris}
              total={total}
              halaman={halaman}
              perHalaman={PER_HALAMAN}
              onHalaman={setHalaman}
              kosong="Tidak ada audit log yang cocok dengan filter."
            />
          </div>
        )}
      </section>
    </div>
  );
}
