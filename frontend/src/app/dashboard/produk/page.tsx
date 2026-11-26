import type { Metadata } from "next";

import { KelolaProduk } from "@/components/dasbor/kelola-produk";

export const metadata: Metadata = { title: "Produk" };

export default function Page() {
  return <KelolaProduk />;
}
