import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BilahKatalog } from "@/components/fitur/bilah-katalog";
import { FilterSamping } from "@/components/fitur/filter-samping";
import { KartuProduk } from "@/components/fitur/kartu-produk";
import { Paginasi } from "@/components/fitur/paginasi";
import { apiServer } from "@/lib/api-server";
import type { DataKategori, HasilKatalog } from "@/types/katalog";

export const metadata: Metadata = { title: "Koleksi" };

type SP = Record<string, string | string[] | undefined>;

function bangunQuery(sp: SP) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "tampilan" || v === undefined) continue;
    const nama = k === "halaman" ? "page" : k;
    (Array.isArray(v) ? v : [v]).forEach((x) => q.append(nama, x));
  }
  return q.toString();
}

export default async function HalamanKoleksi({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [data, kat] = await Promise.all([
    apiServer<HasilKatalog>(`/katalog/produk/?${bangunQuery(sp)}`),
    apiServer<DataKategori>("/katalog/kategori/"),
  ]);
  const daftar = sp.tampilan === "daftar";
  const namaKategori = kat.kategori.find((k) => k.slug === sp.kategori)?.nama ?? "Semua Koleksi";

  return (
    <div className="wadah pb-0 pt-6">
      <nav className="text-[10.5px] text-tinta-lembut" aria-label="Breadcrumb">
        <Link href="/koleksi" className="hover:text-marun">Beranda</Link>
        <span className="mx-1.5">|</span>
        <span>Koleksi</span>
      </nav>

      <div className="mt-6 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-tinta-lembut">Karya pilihan untuk Anda</p>
          <h1 className="mt-3 text-[44px] leading-[1.05] tracking-tight">Temukan rupa yang Anda suka.</h1>
          <p className="mt-3 text-[12px] text-tinta-lembut">Koleksi batik autentik, dibuat untuk setiap momen.</p>
        </div>
        <p className="pb-1 text-[11px] text-tinta-lembut">
          {data.meta.total_produk} karya · {data.meta.total_perajin} perajin lokal
        </p>
      </div>

      <div className="mt-8 grid grid-cols-[176px_1fr] gap-10 border-t border-garis pt-8">
        <Suspense>
          <FilterSamping
            kategori={kat.kategori} total={kat.total}
            hargaMin={data.meta.harga_min} hargaMaks={data.meta.harga_maks}
          />
        </Suspense>

        <div className="flex min-w-0 flex-col">
          <Suspense>
            <BilahKatalog judul={namaKategori} jumlah={data.jumlah} />
          </Suspense>

          {data.hasil.length === 0 ? (
            <div className="rounded-md border border-dashed border-garis py-20 text-center">
              <p className="font-serif text-[22px]">Belum ada yang cocok.</p>
              <p className="mt-1 text-[12px] text-tinta-lembut">Coba ubah kata kunci atau longgarkan filter Anda.</p>
            </div>
          ) : daftar ? (
            <div>{data.hasil.map((p) => <KartuProduk key={p.id} p={p} daftar />)}</div>
          ) : (
            <div className="grid grid-cols-3 gap-x-4 gap-y-7">
              {data.hasil.map((p) => <KartuProduk key={p.id} p={p} />)}
            </div>
          )}

          <div className="mt-9 flex items-center justify-between border-t border-garis pt-4 text-[11px] text-tinta-lembut">
            <span>Menampilkan {data.dari}–{data.sampai} dari {data.jumlah} produk</span>
            <Suspense><Paginasi halaman={data.halaman} total={data.total_halaman} /></Suspense>
          </div>

          <section className="mt-auto border-t border-garis pb-14 pt-8">
            <h2 className="text-[27px]">Keindahan dalam perbedaan.</h2>
            <p className="mt-2 max-w-[520px] text-[11.5px] leading-relaxed text-tinta-lembut">
              Setiap batik memiliki variasi motif dan warna yang halus. Itulah karakter karya tangan yang membuat nilai Anda terasa istimewa.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
