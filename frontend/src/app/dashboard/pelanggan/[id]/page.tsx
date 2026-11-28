import type { Metadata } from "next";

import { DetailPelanggan } from "@/components/dasbor/detail-pelanggan";

export const metadata: Metadata = { title: "Detail Pelanggan" };

type Props = { params: Promise<{ id: string }> };

export default async function HalamanDetailPelanggan({ params }: Props) {
  const { id } = await params;
  return <DetailPelanggan id={id} />;
}
