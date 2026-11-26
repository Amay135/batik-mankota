import type { Metadata } from "next";

import { InventarisDasbor } from "@/components/dasbor/inventaris";

export const metadata: Metadata = { title: "Inventaris" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; produk?: string; varian?: string }>;
}) {
  const q = await searchParams;
  return <InventarisDasbor awalTab={q.tab} awalProduk={q.produk} awalVarian={q.varian} />;
}
