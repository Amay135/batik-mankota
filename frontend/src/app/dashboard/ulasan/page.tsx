import type { Metadata } from "next";

import { UlasanDasbor } from "@/components/dasbor/ulasan";

export const metadata: Metadata = { title: "Ulasan" };

export default function Page() {
  return <UlasanDasbor />;
}
