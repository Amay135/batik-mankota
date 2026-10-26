import type { Metadata } from "next";

import { Checkout } from "@/components/fitur/checkout";
import { penggunaSaatIni } from "@/lib/api-server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Keranjang & Checkout" };

export default async function HalamanCheckout() {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) redirect("/masuk");
  return <Checkout pengguna={pengguna} />;
}
