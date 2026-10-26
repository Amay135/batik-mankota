"use client";

import { ChevronDown, Lock, Minus, PackageCheck, Plus, RefreshCw, ShieldCheck, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SeniProduk } from "@/components/ui/seni-produk";
import { ApiError, api, galatPerField } from "@/lib/api";
import { NAMA_WARNA, rupiah } from "@/lib/format";
import { SITUS } from "@/lib/situs";
import { BANK, PROVINSI } from "@/lib/wilayah";
import type { Pengguna, Pesanan } from "@/types/pesanan";

import { useKeranjang } from "./keranjang-konteks";

const kartu = "rounded-md border border-garis bg-white p-[18px]";
const judulKartu = "text-[13px] font-semibold";

function Medan({ label, galat, children }: { label: string; galat?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-mk">{label}</span>
      {children}
      {galat && <span role="alert" className="mt-1 block text-[10.5px] text-marun">{galat}</span>}
    </label>
  );
}

function Pilihan({ children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select {...rest} className="input-mk appearance-none pr-8">{children}</select>
      <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-tinta-lembut" />
    </span>
  );
}

export function Checkout({ pengguna }: { pengguna: Pengguna }) {
  const router = useRouter();
  const { keranjang, muat, ubahJumlah, hapus, pakaiVoucher, lepasVoucher, segarkan } = useKeranjang();

  const [f, setF] = useState({
    nama_lengkap: pengguna.nama_lengkap, whatsapp: pengguna.whatsapp, email: pengguna.email,
    alamat: "", provinsi: "", kota: "", kecamatan: "", kode_pos: "",
  });
  const [metode, setMetode] = useState<"transfer_bank" | "qris" | "dompet_digital">("transfer_bank");
  const [bank, setBank] = useState("bca");
  const [kodeVoucher, setKodeVoucher] = useState("");
  const [galatVoucher, setGalatVoucher] = useState("");
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState("");
  const [kirim, setKirim] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  async function aksi(fn: () => Promise<unknown>) {
    setGalatUmum("");
    try { await fn(); } catch (e) { setGalatUmum(e instanceof ApiError ? e.message : "Terjadi kesalahan."); }
  }

  async function voucher() {
    setGalatVoucher("");
    if (!kodeVoucher.trim()) return;
    try { await pakaiVoucher(kodeVoucher.trim()); setKodeVoucher(""); }
    catch (e) { setGalatVoucher(e instanceof ApiError ? e.message : "Voucher gagal dipakai."); }
  }

  async function buatPesanan() {
    setKirim(true); setGalat({}); setGalatUmum("");
    try {
      const p = await api<Pesanan>("/pesanan/", {
        method: "POST",
        body: { ...f, metode_bayar: metode, bank: metode === "transfer_bank" ? bank : "" },
      });
      await segarkan(); // keranjang sudah dikosongkan server; segarkan badge header
      router.push(`/pesanan/${p.nomor}`);
    } catch (e) {
      setGalat(galatPerField(e));
      if (e instanceof ApiError && typeof e.data.detail === "string") setGalatUmum(e.data.detail);
      else if (e instanceof ApiError && Object.keys(galatPerField(e)).length) setGalatUmum("Periksa kembali isian yang ditandai.");
      setKirim(false);
    }
  }

  if (muat) return <div className="wadah py-32 text-center text-[12px] text-tinta-lembut">Memuat keranjang...</div>;

  const item = keranjang?.item ?? [];
  const r = keranjang?.ringkasan;

  if (!item.length || !r) {
    return (
      <div className="wadah py-32 text-center">
        <h1 className="text-[38px]">Keranjang Anda masih kosong.</h1>
        <p className="mt-2 text-[12px] text-tinta-lembut">Temukan batik yang bercerita untuk Anda.</p>
        <Link href="/koleksi" className="tombol-marun mt-6">Lihat koleksi</Link>
      </div>
    );
  }

  return (
    <div className="wadah pb-16 pt-6">
      <nav className="text-[10.5px] text-tinta-lembut" aria-label="Breadcrumb">
        <Link href="/koleksi" className="hover:text-marun">Beranda</Link><span className="mx-1.5">/</span>
        <span>Keranjang &amp; Checkout</span>
      </nav>

      <div className="mb-6 mt-4 flex items-end justify-between">
        <h1 className="text-[42px] leading-[1.05] tracking-tight">Selangkah lagi, jadi milik Anda.</h1>
        <ol className="flex items-center gap-5 pb-2 text-[11px]">
          {["Keranjang", "Pengiriman", "Pembayaran"].map((l, i) => (
            <li key={l} className="flex items-center gap-1.5">
              <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] ${i === 0 ? "bg-marun text-krem" : "border border-garis text-tinta-lembut"}`}>{i + 1}</span>
              <span className={i === 0 ? "text-tinta" : "text-tinta-lembut"}>{l}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-[1fr_322px] items-start gap-6">
        <div className="space-y-4">
          {/* Keranjang */}
          <section className={kartu} aria-label="Keranjang Anda">
            <div className="mb-3 flex items-center justify-between">
              <h2 className={judulKartu + " font-sans"}>Keranjang Anda</h2>
              <span className="text-[10.5px] text-tinta-lembut">{r.jumlah_produk} produk</span>
            </div>
            <ul className="divide-y divide-garis">
              {item.map((it) => (
                <li key={it.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <Link href={`/produk/${it.produk.slug}`} className="h-[54px] w-[44px] shrink-0 overflow-hidden rounded-[3px]">
                    <SeniProduk motif={it.produk.motif} bentuk={it.produk.bentuk} warna={it.varian.warna} foto={it.produk.foto_utama} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/produk/${it.produk.slug}`} className="block truncate text-[12.5px] font-semibold hover:text-marun">{it.produk.nama}</Link>
                    <p className="mt-0.5 text-[10.5px] text-tinta-lembut">
                      {NAMA_WARNA[it.varian.warna]}{it.varian.ukuran !== "ALL" && ` / ${it.varian.ukuran}`} · SKU: {it.varian.sku}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium">{rupiah(it.harga)}</p>
                  </div>
                  <div className="flex h-7 items-center gap-2 rounded border border-garis px-1.5">
                    <button aria-label="Kurangi" disabled={it.jumlah <= 1} onClick={() => aksi(() => ubahJumlah(it.id, it.jumlah - 1))} className="disabled:opacity-30"><Minus size={11} /></button>
                    <span className="w-3 text-center text-[11px]">{it.jumlah}</span>
                    <button aria-label="Tambah" disabled={it.jumlah >= it.varian.stok} onClick={() => aksi(() => ubahJumlah(it.id, it.jumlah + 1))} className="disabled:opacity-30"><Plus size={11} /></button>
                  </div>
                  <p className="w-[78px] text-right text-[12px] font-semibold">{rupiah(it.subtotal)}</p>
                  <button aria-label={`Hapus ${it.produk.nama}`} onClick={() => aksi(() => hapus(it.id))} className="text-tinta-lembut hover:text-marun"><Trash2 size={13} /></button>
                </li>
              ))}
            </ul>
          </section>

          {/* Identitas */}
          <section className={kartu}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className={judulKartu + " font-sans"}>1. Identitas Pembeli</h2>
              <span className="text-[10.5px] text-tinta-lembut">Masuk sebagai {pengguna.email}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Medan label="Nama lengkap" galat={galat.nama_lengkap}><input className="input-mk" value={f.nama_lengkap} onChange={set("nama_lengkap")} autoComplete="name" /></Medan>
              <Medan label="Nomor WhatsApp" galat={galat.whatsapp}><input className="input-mk" value={f.whatsapp} onChange={set("whatsapp")} inputMode="tel" autoComplete="tel" placeholder="0812 3456 7890" /></Medan>
            </div>
            <div className="mt-3"><Medan label="Email" galat={galat.email}><input className="input-mk" type="email" value={f.email} onChange={set("email")} autoComplete="email" /></Medan></div>
          </section>

          {/* Alamat */}
          <section className={kartu}>
            <h2 className={judulKartu + " mb-3 font-sans"}>2. Alamat &amp; Pengiriman</h2>
            <Medan label="Alamat lengkap" galat={galat.alamat}><input className="input-mk" value={f.alamat} onChange={set("alamat")} autoComplete="street-address" placeholder="Jl. Komang Raya No. 18, RT 003 / RW 002" /></Medan>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Medan label="Provinsi" galat={galat.provinsi}>
                <Pilihan value={f.provinsi} onChange={set("provinsi")}>
                  <option value="">Pilih provinsi</option>
                  {PROVINSI.map((p) => <option key={p}>{p}</option>)}
                </Pilihan>
              </Medan>
              <Medan label="Kota / Kabupaten" galat={galat.kota}><input className="input-mk" value={f.kota} onChange={set("kota")} placeholder="Jakarta Selatan" /></Medan>
              <Medan label="Kecamatan" galat={galat.kecamatan}><input className="input-mk" value={f.kecamatan} onChange={set("kecamatan")} placeholder="Mampang Prapatan" /></Medan>
              <Medan label="Kode pos" galat={galat.kode_pos}><input className="input-mk" value={f.kode_pos} onChange={set("kode_pos")} inputMode="numeric" maxLength={5} placeholder="12730" /></Medan>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-md border border-marun/40 bg-[#F6EAE3] px-3.5 py-3">
              <Truck size={16} className="text-marun" />
              <div className="flex-1">
                <p className="text-[12px] font-semibold">JNE REG · 2–3 hari kerja</p>
                <p className="text-[10.5px] text-tinta-lembut">Dikirim dari Laweyan, Surakarta</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] font-semibold">{r.promo_ongkir ? "Gratis" : rupiah(r.ongkir)}</p>
                {r.promo_ongkir > 0 && <p className="text-[10px] text-tinta-lembut">Hemat {rupiah(r.promo_ongkir)}</p>}
              </div>
            </div>
          </section>

          {/* Pembayaran */}
          <section className={kartu}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className={judulKartu + " font-sans"}>3. Pembayaran</h2>
              <span className="text-[10.5px] text-tinta-lembut">Terenkripsi &amp; aman</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Metode pembayaran">
              {([["transfer_bank", "Transfer Bank"], ["qris", "QRIS"], ["dompet_digital", "Dompet Digital"]] as const).map(([v, l]) => (
                <label key={v} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-3 text-[12px] ${metode === v ? "border-tinta/70 bg-krem" : "border-garis bg-white hover:border-marun"}`}>
                  <input type="radio" name="metode" className="bulat" checked={metode === v} onChange={() => setMetode(v)} />
                  {l}
                </label>
              ))}
            </div>
            {metode === "transfer_bank" && (
              <div className="mt-3">
                <Medan label="Bank tujuan" galat={galat.bank}>
                  <Pilihan value={bank} onChange={(e) => setBank(e.target.value)}>
                    {BANK.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Pilihan>
                </Medan>
              </div>
            )}
            <p className="mt-3 text-[10.5px] text-tinta-lembut">
              {metode === "transfer_bank" ? "Nomor virtual account akan tampil setelah pesanan dibuat. Bayar dalam 24 jam." : "Kode pembayaran akan tampil setelah pesanan dibuat. Bayar dalam 24 jam."}
            </p>
          </section>
        </div>

        {/* Ringkasan */}
        <aside className="sticky top-5 space-y-5">
          <section className={kartu} aria-label="Ringkasan Pesanan">
            <h2 className={judulKartu + " mb-3 font-sans"}>Ringkasan Pesanan</h2>
            {r.kode_voucher ? (
              <div className="flex h-9 items-center justify-between rounded-md border border-garis bg-krem px-3 text-[11.5px]">
                <span>Voucher <b>{r.kode_voucher}</b> terpasang</span>
                <button onClick={() => aksi(lepasVoucher)} className="text-tinta-lembut hover:text-marun">Lepas</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input value={kodeVoucher} onChange={(e) => setKodeVoucher(e.target.value)} onKeyDown={(e) => e.key === "Enter" && voucher()}
                  placeholder="Kode voucher" aria-label="Kode voucher" className="h-9 min-w-0 flex-1 rounded-md border border-garis bg-white px-3 text-[12px] focus:border-marun focus:outline-none" />
                <button onClick={voucher} className="h-9 rounded-md border border-garis bg-krem px-4 text-[12px] font-medium hover:border-marun">Pakai</button>
              </div>
            )}
            {galatVoucher && <p role="alert" className="mt-1.5 text-[10.5px] text-marun">{galatVoucher}</p>}
            {r.voucher_galat && <p className="mt-1.5 text-[10.5px] text-marun">{r.voucher_galat}</p>}

            <dl className="mt-4 space-y-2 border-t border-garis pt-4 text-[11.5px]">
              <div className="flex justify-between"><dt className="text-tinta-lembut">Subtotal ({r.jumlah_produk} produk)</dt><dd>{rupiah(r.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-tinta-lembut">Pengiriman</dt><dd>{rupiah(r.ongkir)}</dd></div>
              {r.promo_ongkir > 0 && <div className="flex justify-between"><dt className="text-tinta-lembut">Promo gratis ongkir</dt><dd>−{rupiah(r.promo_ongkir)}</dd></div>}
              {r.diskon_voucher > 0 && <div className="flex justify-between"><dt className="text-tinta-lembut">Voucher</dt><dd>−{rupiah(r.diskon_voucher)}</dd></div>}
            </dl>
            <div className="mt-4 flex items-baseline justify-between border-t border-garis pt-4">
              <span className="text-[12px] font-semibold">Total Pembayaran</span>
              <span className="text-[20px] font-semibold tracking-tight">{rupiah(r.total)}</span>
            </div>
            <p className="mt-1 text-right text-[10px] text-tinta-lembut">Harga sudah termasuk PPN</p>

            <button onClick={buatPesanan} disabled={kirim} className="tombol-marun mt-4 w-full">
              <Lock size={13} /> {kirim ? "Memproses..." : "Buat Pesanan & Bayar"}
            </button>
            {galatUmum && <p role="alert" className="mt-2 text-[11px] text-marun">{galatUmum}</p>}
            <p className="mt-3 text-center text-[10px] leading-relaxed text-tinta-lembut">
              Dengan melanjutkan, Anda menyetujui Syarat &amp; Ketentuan serta Kebijakan Privasi Batik Mankota.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-md bg-krem px-3 py-2.5 text-[10.5px] text-tinta-lembut">
              <PackageCheck size={13} className="text-emas" />
              Anda akan mendapatkan {Math.floor(r.total / 10000)} poin Mankota dari pesanan ini.
            </div>
          </section>

          <section>
            <h3 className="text-[22px]">Kami di sini untuk Anda.</h3>
            <p className="mt-1.5 text-[11px] leading-relaxed text-tinta-lembut">Ada pertanyaan tentang pesanan? Hubungi kami sebelum melakukan pembayaran.</p>
            <a href={SITUS.waLink} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] font-medium hover:text-marun">WhatsApp {SITUS.wa} →</a>
          </section>

          <ul className="space-y-2.5 rounded-md border border-garis px-4 py-3.5 text-[11px] text-tinta-lembut">
            <li className="flex items-center gap-2.5"><ShieldCheck size={13} className="text-emas" /> Pembayaran aman</li>
            <li className="flex items-center gap-2.5"><PackageCheck size={13} className="text-emas" /> Diperiksa sebelum dikirim</li>
            <li className="flex items-center gap-2.5"><RefreshCw size={13} className="text-emas" /> Tukar ukuran dalam 7 hari</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
