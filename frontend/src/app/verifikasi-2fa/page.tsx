import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Verifikasi2fa } from "@/components/dasbor/verifikasi-2fa";
import { penggunaSaatIni } from "@/lib/api-server";

export const metadata: Metadata = { title: "Verifikasi 2FA" };

export default async function HalamanVerifikasi2fa() {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) redirect("/masuk?next=/dashboard");
  if (pengguna.role !== "admin") redirect("/403");
  if (pengguna.totp_verified) redirect("/dashboard");

  return (
    <div data-area="dashboard" className="flex min-h-screen items-center justify-center bg-dash-bg px-4 py-10 text-dash-text">
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-2xl">Verifikasi dua langkah</h1>
        <p className="mb-5 text-[12px] text-dash-text-muted">
          Akun admin wajib memasukkan kode TOTP sebelum membuka dashboard.
        </p>
        <Verifikasi2fa sudahTerdaftar={pengguna.totp_enrolled} />
      </div>
    </div>
  );
}
