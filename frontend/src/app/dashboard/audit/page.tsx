import type { Metadata } from "next";

import { DaftarAudit } from "@/components/dasbor/daftar-audit";

export const metadata: Metadata = { title: "Log Audit" };

export default function HalamanAudit() {
  return <DaftarAudit />;
}
