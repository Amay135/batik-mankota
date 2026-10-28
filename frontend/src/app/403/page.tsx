import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Akses ditolak" };

export default function Halaman403() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl">Akses ditolak</h1>
      <p className="mt-2 text-[12px] text-tinta-lembut">
        Halaman ini tidak tersedia untuk peran akun Anda.
      </p>
      <Link href="/" className="tombol-marun mt-6">Kembali ke beranda</Link>
    </main>
  );
}
