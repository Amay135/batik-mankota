import { redirect } from "next/navigation";

import { FooterSitus } from "@/components/fitur/footer-situs";
import { HeaderSitus, PengumumanBar } from "@/components/fitur/header-situs";
import { KeranjangProvider } from "@/components/fitur/keranjang-konteks";
import { penggunaSaatIni } from "@/lib/api-server";

// Seluruh marketplace ada di grup ini: sesi harus valid, kalau tidak -> /masuk.
export default async function LayoutAkun({ children }: { children: React.ReactNode }) {
  const pengguna = await penggunaSaatIni();
  if (!pengguna) redirect("/masuk");

  return (
    <KeranjangProvider role={pengguna.role}>
      <PengumumanBar />
      <HeaderSitus pengguna={pengguna} />
      <main>{children}</main>
      <FooterSitus />
    </KeranjangProvider>
  );
}
