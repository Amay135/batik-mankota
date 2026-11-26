import type { Metadata } from "next";

import { LabelQr } from "@/components/dasbor/label-qr";

export const metadata: Metadata = { title: "Label QR" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ produk?: string; varian?: string }>;
}) {
  const q = await searchParams;
  return <LabelQr awalProduk={q.produk} awalVarian={q.varian} />;
}
