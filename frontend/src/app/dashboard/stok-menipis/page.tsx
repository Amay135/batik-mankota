import type { Metadata } from "next";

import { StokMenipis } from "@/components/dasbor/stok-menipis";

export const metadata: Metadata = { title: "Stok Menipis" };

export default function Page() {
  return <StokMenipis />;
}
