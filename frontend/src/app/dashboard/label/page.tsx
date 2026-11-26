import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ produk?: string; varian?: string }>;
}) {
  const q = await searchParams;
  const params = new URLSearchParams({ tab: "label" });
  if (q.produk) params.set("produk", q.produk);
  if (q.varian) params.set("varian", q.varian);
  redirect(`/dashboard/inventaris?${params}`);
}
