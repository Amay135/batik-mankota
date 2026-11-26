import type { Metadata } from "next";

import { StokDasbor } from "@/components/dasbor/stok";

export const metadata: Metadata = { title: "Stok" };

export default function Page() {
  return <StokDasbor />;
}
