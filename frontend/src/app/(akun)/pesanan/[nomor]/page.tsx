import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { apiServer } from "@/lib/api-server";
import { NAMA_WARNA, rupiah } from "@/lib/format";
import type { Pesanan } from "@/types/pesanan";

export const metadata: Metadata = { title: "Pesanan Anda" };

export default async function HalamanPesanan({ params }: { params: Promise<{ nomor: string }> }) {
  const { nomor } = await params;
  const p = await apiServer<Pesanan | null>(`/pesanan/${nomor}/`);
  if (!p) notFound();
  const batas = new Date(p.batas_bayar).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" });

  return (
    <div className="wadah pb-20 pt-10">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-tinta-lembut">Pesanan {p.nomor}</p>
      <h1 className="mt-3 text-[42px] leading-[1.05]">Terima kasih, pesanan Anda tercatat.</h1>
      <p className="mt-2 text-[12px] text-tinta-lembut">Status: <b className="text-tinta">{p.status_label}</b></p>

      <div className="mt-8 grid grid-cols-[1fr_340px] items-start gap-6">
        <section className="rounded-md border border-garis bg-white p-5">
          <h2 className="font-sans text-[13px] font-semibold">Rincian pesanan</h2>
          <ul className="mt-3 divide-y divide-garis">
            {p.item.map((i) => (
              <li key={i.sku} className="flex justify-between py-3 text-[12px]">
                <div>
                  <p className="font-semibold">{i.nama}</p>
                  <p className="text-[10.5px] text-tinta-lembut">{NAMA_WARNA[i.warna]}{i.ukuran !== "ALL" && ` / ${i.ukuran}`} · {i.jumlah} × {rupiah(i.harga)}</p>
                </div>
                <span className="font-medium">{rupiah(i.subtotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t border-garis pt-3 text-[11.5px]">
            <p className="font-semibold">Dikirim ke</p>
            <p className="mt-1 text-tinta-lembut">{p.nama_lengkap} · {p.whatsapp}<br />{p.alamat}, {p.kecamatan}, {p.kota}, {p.provinsi} {p.kode_pos}</p>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-md border border-garis bg-white p-5 text-[12px]">
            <h2 className="font-sans text-[13px] font-semibold">Pembayaran · {p.metode_label}</h2>
            {p.nomor_va && (
              <>
                <p className="mt-3 text-[10.5px] text-tinta-lembut">Nomor virtual account {p.bank.toUpperCase()}</p>
                <p className="mt-0.5 font-mono text-[18px] tracking-wider">{p.nomor_va}</p>
              </>
            )}
            <dl className="mt-4 space-y-1.5 border-t border-garis pt-3 text-[11.5px]">
              <div className="flex justify-between"><dt className="text-tinta-lembut">Subtotal</dt><dd>{rupiah(p.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-tinta-lembut">Pengiriman</dt><dd>{rupiah(p.ongkir)}</dd></div>
              {p.promo_ongkir > 0 && <div className="flex justify-between"><dt className="text-tinta-lembut">Promo gratis ongkir</dt><dd>−{rupiah(p.promo_ongkir)}</dd></div>}
              {p.diskon > 0 && <div className="flex justify-between"><dt className="text-tinta-lembut">Voucher {p.voucher_kode}</dt><dd>−{rupiah(p.diskon)}</dd></div>}
            </dl>
            <div className="mt-3 flex items-baseline justify-between border-t border-garis pt-3">
              <span className="font-semibold">Total</span><span className="text-[20px] font-semibold">{rupiah(p.total)}</span>
            </div>
            <p className="mt-3 text-[10.5px] text-tinta-lembut">Bayar sebelum {batas} WIB.</p>
          </section>
          <Link href="/koleksi" className="tombol-putih w-full">Lanjut belanja</Link>
        </aside>
      </div>
    </div>
  );
}
