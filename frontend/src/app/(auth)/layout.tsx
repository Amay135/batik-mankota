import { redirect } from "next/navigation";

import { Logo } from "@/components/ui/ornamen";
import { penggunaSaatIni } from "@/lib/api-server";

export default async function LayoutAuth({ children }: { children: React.ReactNode }) {
  if (await penggunaSaatIni()) redirect("/koleksi");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Logo />
      <div className="mt-8 w-full max-w-[380px] rounded-md border border-garis bg-white p-7">{children}</div>
      <p className="mt-6 text-[10.5px] text-tinta-lembut">Merawat warisan, merayakan keseharian.</p>
    </div>
  );
}
