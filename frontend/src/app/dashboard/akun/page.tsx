import type { Metadata } from "next";

import { KelolaAkun } from "@/components/dasbor/kelola-akun";

export const metadata: Metadata = { title: "Akun" };

export default function HalamanAkun() {
  return <KelolaAkun />;
}
