import type { Metadata } from "next";
import { Suspense } from "react";

import { FormAuth } from "@/components/fitur/form-auth";

export const metadata: Metadata = { title: "Masuk" };

export default function HalamanMasuk() {
  return (
    <>
      <h1 className="text-[30px] leading-tight">Selamat datang kembali.</h1>
      <p className="mb-5 mt-1 text-[11.5px] text-tinta-lembut">Masuk untuk melihat koleksi dan berbelanja.</p>
      <Suspense><FormAuth mode="masuk" /></Suspense>
    </>
  );
}
