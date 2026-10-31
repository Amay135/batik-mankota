import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MenuDasbor } from "@/components/dasbor/menu-dasbor";
import { PenyediaQuery } from "@/components/dasbor/penyedia-query";
import { TombolKeluar } from "@/components/dasbor/tombol-keluar";
import { requireRole } from "@/lib/api-server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function LayoutDasbor({ children }: { children: React.ReactNode }) {
  const pengguna = await requireRole("admin");
  if (!pengguna.totp_verified) redirect("/verifikasi-2fa");

  return (
    <PenyediaQuery>
      <div data-area="dashboard" className="min-h-screen bg-dash-bg text-dash-text">
        <header className="border-b border-dash-border bg-dash-surface">
          <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6 md:px-8">
            <Link href="/dashboard" className="font-serif text-lg">Mankota</Link>
            <div className="flex items-center gap-3">
              <span className="hidden text-[11.5px] text-dash-text-muted sm:inline">
                {pengguna.nama_lengkap || pengguna.email}
              </span>
              <TombolKeluar />
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 py-6 md:flex-row md:px-8">
          <aside className="md:w-48 md:shrink-0">
            <p className="mb-2 px-3 text-[10.5px] uppercase tracking-wide text-dash-text-muted">Kelola</p>
            <MenuDasbor />
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </PenyediaQuery>
  );
}
