import type { Metadata } from "next";
import { Suspense } from "react";

import { FormAuth } from "@/components/fitur/form-auth";

export const metadata: Metadata = { title: "Daftar" };

export default function HalamanDaftar() {
  return (
    <>
      <h1 className="text-[30px] leading-tight">Mulai cerita Anda.</h1>
      <p className="mb-5 mt-1 text-[11.5px] text-tinta-lembut">Buat akun untuk menjelajahi koleksi Mankota.</p>
      <Suspense><FormAuth mode="daftar" /></Suspense>
    </>
  );
}
