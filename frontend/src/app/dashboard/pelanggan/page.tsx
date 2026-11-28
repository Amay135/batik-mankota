import type { Metadata } from "next";

import { DaftarPelanggan } from "@/components/dasbor/pelanggan";

export const metadata: Metadata = { title: "Pelanggan" };

export default function HalamanPelanggan() {
  return <DaftarPelanggan />;
}
