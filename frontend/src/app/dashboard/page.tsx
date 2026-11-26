import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/dasbor/keadaan";
import { ADMIN_MENU } from "@/lib/admin-menu";
import { requireRole } from "@/lib/api-server";

export const metadata: Metadata = { title: "Dashboard" };

const FORMAT_TANGGAL = new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeZone: "Asia/Jakarta" });

export default async function HalamanDashboard() {
  const pengguna = await requireRole("admin");
  const hariIni = FORMAT_TANGGAL.format(new Date());
  const tautan = ADMIN_MENU.flatMap((grup) =>
    grup.item.flatMap((item) => (item.href && item.href !== "/dashboard" ? [{ label: item.label, href: item.href }] : [])),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Dashboard</h1>
        <p className="mt-1 text-[12px] text-dash-text-muted">
          Selamat datang, {pengguna.nama_lengkap || pengguna.email}. {hariIni}.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel-dasbor" aria-labelledby="ringkasan-operasional">
          <h2 id="ringkasan-operasional" className="font-sans text-[13px] font-semibold">
            Ringkasan operasional
          </h2>
          <EmptyState pesan="Ringkasan penjualan dan pesanan belum tersedia — modul pesanan belum dibangun." />
        </section>

        <section className="panel-dasbor" aria-labelledby="ringkasan-stok">
          <h2 id="ringkasan-stok" className="font-sans text-[13px] font-semibold">
            Ringkasan stok
          </h2>
          <EmptyState pesan="Ringkasan stok belum tersedia di sini. Angka stok dan stok menipis ada di halaman Inventaris." />
          <Link href="/dashboard/inventaris" className="tombol-sekunder mt-2 h-8 px-3 text-[11.5px]">
            Buka Inventaris
          </Link>
        </section>
      </div>

      <section className="panel-dasbor" aria-labelledby="aktivitas-terbaru">
        <h2 id="aktivitas-terbaru" className="font-sans text-[13px] font-semibold">
          Aktivitas terbaru
        </h2>
        <EmptyState pesan="Belum ada aktivitas untuk ditampilkan." />
        <Link href="/dashboard/audit" className="tombol-sekunder h-8 px-3 text-[11.5px]">
          Lihat log audit
        </Link>
      </section>

      <section className="panel-dasbor" aria-labelledby="navigasi-cepat">
        <h2 id="navigasi-cepat" className="font-sans text-[13px] font-semibold">
          Navigasi cepat
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {tautan.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md border border-dash-border px-3 py-2 text-[12.5px] text-dash-text transition-colors hover:border-dash-primary hover:bg-dash-bg-alt"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
