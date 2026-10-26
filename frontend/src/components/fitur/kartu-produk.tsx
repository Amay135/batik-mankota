import Link from "next/link";

import { SeniProduk } from "@/components/ui/seni-produk";
import { rupiah } from "@/lib/format";
import type { ProdukRingkas } from "@/types/katalog";

export function LencanaPilihan() {
  return (
    <span className="absolute left-2.5 top-2.5 rounded-[3px] bg-white px-2 py-[3px] text-[9px] font-medium text-tinta shadow-sm">
      Pilihan Mankota
    </span>
  );
}

export function KartuProduk({ p, daftar = false }: { p: ProdukRingkas; daftar?: boolean }) {
  const gambar = (
    <div className={`relative overflow-hidden rounded-[3px] bg-krem-gelap ${daftar ? "aspect-[4/5] w-[150px] shrink-0" : "aspect-[4/5] w-full"}`}>
      <SeniProduk motif={p.motif} bentuk={p.bentuk} warna={p.warna_utama} foto={p.foto_utama}
        className="transition-transform duration-500 group-hover:scale-[1.03]" />
      {p.unggulan && <LencanaPilihan />}
    </div>
  );
  const teks = (
    <div className={daftar ? "flex flex-col justify-center" : "pt-3"}>
      <p className="text-[10px] text-tinta-lembut">{p.label}</p>
      <h3 className="mt-0.5 font-serif text-[19px] leading-snug text-tinta">{p.nama}</h3>
      <p className="mt-1 text-[12.5px] font-medium text-tinta">{rupiah(p.harga)}</p>
    </div>
  );
  return (
    <Link href={`/produk/${p.slug}`} className={`group block ${daftar ? "flex gap-5 border-b border-garis py-4" : ""}`}>
      {gambar}
      {teks}
    </Link>
  );
}
