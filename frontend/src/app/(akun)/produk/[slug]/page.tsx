import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DetailProduk } from "@/components/fitur/detail-produk";
import { KartuProduk } from "@/components/fitur/kartu-produk";
import { apiServer, penggunaSaatIni } from "@/lib/api-server";
import type { ProdukDetail } from "@/types/katalog";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await apiServer<ProdukDetail | null>(`/katalog/produk/${slug}/`);
  return { title: p?.nama ?? "Produk" };
}

export default async function HalamanProduk({ params }: Props) {
  const { slug } = await params;
  const [p, pengguna] = await Promise.all([
    apiServer<ProdukDetail | null>(`/katalog/produk/${slug}/`),
    penggunaSaatIni(),
  ]);
  if (!p) notFound();

  return (
    <>
      <div className="wadah pb-14 pt-5">
        <nav className="mb-4 text-[10.5px] text-tinta-lembut" aria-label="Breadcrumb">
          <Link href="/koleksi" className="hover:text-marun">Beranda</Link>
          <span className="mx-1.5">/</span>
          <Link href="/koleksi" className="hover:text-marun">Koleksi</Link>
          <span className="mx-1.5">/</span>
          <span>{p.nama}</span>
        </nav>
        <DetailProduk key={p.slug} p={p} role={pengguna?.role ?? "user"} />
      </div>

      <section className="bg-white py-12">
        <div className="wadah">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-[32px]">Lengkapi cerita Anda.</h2>
            <Link href="/koleksi" className="text-[11px] text-tinta hover:text-marun">Lihat koleksi lainnya →</Link>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {p.terkait.map((t) => <KartuProduk key={t.id} p={t} />)}
          </div>
        </div>
      </section>
    </>
  );
}
