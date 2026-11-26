import type { Metadata } from "next";

import { PanduanUkuran } from "@/components/dasbor/panduan-ukuran";

export const metadata: Metadata = { title: "Panduan Ukuran" };

export default function Page() {
  return <PanduanUkuran />;
}
