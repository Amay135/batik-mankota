import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import KasirShell from "@/components/kasir/kasir-shell";
import { penggunaSaatIni } from "@/lib/api-server";

export const metadata: Metadata = { title: "Kasir" };

// Area kasir: hanya role kasir dan admin (ARSITEKTUR 8.3). Ini penjaga UX;
// penegakan izin sebenarnya tetap di API (IsKasirOrAdmin).
export default async function KasirLayout({ children }: { children: ReactNode }) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) redirect("/masuk?next=%2Fkasir");
  if (pengguna.role !== "kasir" && pengguna.role !== "admin") redirect("/403");
  // Admin wajib 2FA di seluruh sistem, sama seperti layout dashboard.
  if (pengguna.role === "admin" && !pengguna.totp_verified) redirect("/verifikasi-2fa");

  return <KasirShell>{children}</KasirShell>;
}