"use client";

import { Heart, Minus, Plus, RefreshCw, ShieldCheck, ShoppingBag, Star, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Ornamen } from "@/components/ui/ornamen";
import { SeniProduk } from "@/components/ui/seni-produk";
import { ApiError } from "@/lib/api";
import { NAMA_WARNA, rupiah, WARNA_HEX } from "@/lib/format";
import type { ProdukDetail, Ukuran } from "@/types/katalog";

import { useKeranjang } from "./keranjang-konteks";

const URUTAN_UKURAN: Ukuran[] = ["S", "M", "L", "XL", "XXL", "ALL"];

export function DetailProduk({ p }: { p: ProdukDetail }) {
  const router = useRouter();
  const { tambah } = useKeranjang();

  const warnaList = useMemo(() => [...new Set(p.varian.map((v) => v.warna))], [p.varian]);
  const [warna, setWarna] = useState(p.warna_utama);
  const ukuranWarna = useMemo(
    () => p.varian.filter((v) => v.warna === warna).sort((a, b) => URUTAN_UKURAN.indexOf(a.ukuran) - URUTAN_UKURAN.indexOf(b.ukuran)),
    [p.varian, warna],
  );
  const awal = ukuranWarna.find((v) => v.ukuran === "L" && v.stok > 0) ?? ukuranWarna.find((v) => v.stok > 0) ?? ukuranWarna[0];
  const [ukuran, setUkuran] = useState<Ukuran>(awal?.ukuran ?? "ALL");
  const [jumlah, setJumlah] = useState(1);
  const [foto, setFoto] = useState(0);
  const [suka, setSuka] = useState(false);
  const [proses, setProses] = useState<"" | "tambah" | "beli">("");
  const [pesan, setPesan] = useState<{ jenis: "ok" | "galat"; teks: string } | null>(null);

  const varian = ukuranWarna.find((v) => v.ukuran === ukuran) ?? ukuranWarna[0];
  const satuUkuran = ukuranWarna.length === 1 && ukuranWarna[0].ukuran === "ALL";
  const habis = !varian || varian.stok < 1;

  function gantiWarna(w: typeof warna) {
    setWarna(w);
    const daftar = p.varian.filter((v) => v.warna === w);
    const sama = daftar.find((v) => v.ukuran === ukuran && v.stok > 0) ?? daftar.find((v) => v.stok > 0) ?? daftar[0];
    setUkuran(sama?.ukuran ?? "ALL");
    setJumlah(1);
    setPesan(null);
  }

  async function simpan(mode: "tambah" | "beli") {
    if (!varian) return;
    setProses(mode); setPesan(null);
    try {
      await tambah(varian.id, jumlah);
      if (mode === "beli") router.push("/checkout");
      else setPesan({ jenis: "ok", teks: "Ditambahkan ke keranjang." });
    } catch (e) {
      setPesan({ jenis: "galat", teks: e instanceof ApiError ? e.message : "Gagal menambahkan ke keranjang." });
    } finally {
      setProses("");
    }
  }

  const rating = Number(p.rating);

  return (
    <div className="grid grid-cols-[1.12fr_1fr] gap-12">
      {/* Galeri */}
      <div>
        <div className="relative aspect-[1/1.02] overflow-hidden rounded-[4px] bg-krem-gelap">
          <SeniProduk motif={p.motif} bentuk={p.bentuk} warna={warna} jenis={p.foto[foto]?.jenis ?? "depan"} foto={p.foto[foto]?.url} />
          <button onClick={() => setSuka((s) => !s)} aria-label="Simpan ke favorit" aria-pressed={suka}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
            <Heart size={15} className={suka ? "fill-marun text-marun" : "text-tinta"} />
          </button>
        </div>
        <div className="mt-2.5 grid grid-cols-4 gap-2.5">
          {p.foto.map((f, i) => (
            <button key={f.jenis} onClick={() => setFoto(i)} aria-label={`Foto ${f.jenis}`}
              className={`aspect-[1/0.82] overflow-hidden rounded-[3px] border-2 ${i === foto ? "border-marun" : "border-transparent"}`}>
              <SeniProduk motif={p.motif} bentuk={p.bentuk} warna={warna} jenis={f.jenis} foto={f.url} />
            </button>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <Ornamen size={18} className="mt-1 shrink-0" />
          <div>
            <p className="font-serif text-[19px] leading-tight">{p.cerita_judul}</p>
            <p className="mt-1 max-w-[460px] text-[11px] leading-relaxed text-tinta-lembut">{p.cerita_isi}</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div>
        <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.1em] text-tinta-lembut">
          <span>{p.kategori.nama} · Koleksi {p.koleksi}</span>
          <span className={p.tersedia ? "text-[#4D6B3F]" : "text-marun"}>{p.tersedia ? "Tersedia" : "Habis"}</span>
        </div>
        <h1 className="mt-3 text-[38px] leading-[1.08] tracking-tight">{p.nama}</h1>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-tinta-lembut">
          <span className="flex" aria-label={`Rating ${p.rating} dari 5`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={11} className={i <= Math.round(rating) ? "fill-emas text-emas" : "text-garis"} />
            ))}
          </span>
          <span>{p.rating} ({p.jumlah_ulasan} ulasan) · {p.terjual} terjual</span>
        </div>
        <p className="mt-4 text-[26px] font-semibold tracking-tight">{rupiah(p.harga)}</p>
        <p className="mt-3 max-w-[440px] text-[12px] leading-relaxed text-tinta-lembut">{p.deskripsi}</p>

        <div className="mt-5 border-t border-garis pt-4">
          <p className="mb-2 text-[11.5px]"><span className="text-tinta-lembut">Warna:</span> <span className="font-semibold">{NAMA_WARNA[warna]}</span></p>
          <div className="flex gap-2.5">
            {warnaList.map((w) => (
              <button key={w} onClick={() => gantiWarna(w)} aria-label={NAMA_WARNA[w]} aria-pressed={w === warna}
                className={`h-[22px] w-[22px] rounded-full border border-black/10 ring-offset-2 ring-offset-krem ${w === warna ? "ring-2 ring-marun" : ""}`}
                style={{ background: WARNA_HEX[w] }} />
            ))}
          </div>
        </div>

        {!satuUkuran && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-[11.5px]">
              <p><span className="text-tinta-lembut">Pilih Ukuran:</span> <span className="font-semibold">{ukuran}</span></p>
              <a href="#" className="text-[10.5px] text-tinta-lembut underline underline-offset-2 hover:text-marun">Panduan ukuran</a>
            </div>
            <div className="flex gap-2">
              {ukuranWarna.map((v) => (
                <button key={v.id} disabled={v.stok < 1} onClick={() => { setUkuran(v.ukuran); setJumlah(1); setPesan(null); }}
                  aria-pressed={v.ukuran === ukuran}
                  className={`h-9 w-[52px] rounded border text-[12px] transition-colors ${
                    v.ukuran === ukuran ? "border-marun bg-marun text-krem"
                    : v.stok < 1 ? "cursor-not-allowed border-garis bg-transparent text-tinta-lembut/40 line-through"
                    : "border-garis bg-white hover:border-marun"}`}>
                  {v.ukuran}
                </button>
              ))}
            </div>
          </div>
        )}
        {varian && (
          <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-tinta-lembut">
            <span className={`h-1.5 w-1.5 rounded-full ${habis ? "bg-marun" : "bg-[#4D8A3F]"}`} />
            {habis ? "Stok habis" : `Tersedia ${varian.stok} pcs${satuUkuran ? "" : ` untuk ukuran ${varian.ukuran}`}`} · SKU {varian.sku}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <div className="flex h-10 w-[104px] items-center justify-between rounded-md border border-garis bg-white px-2">
            <button aria-label="Kurangi" disabled={jumlah <= 1} onClick={() => setJumlah((j) => j - 1)} className="p-1 disabled:opacity-30"><Minus size={13} /></button>
            <span className="text-[12px]" aria-live="polite">{jumlah}</span>
            <button aria-label="Tambah" disabled={!varian || jumlah >= varian.stok} onClick={() => setJumlah((j) => j + 1)} className="p-1 disabled:opacity-30"><Plus size={13} /></button>
          </div>
          <button className="tombol-marun flex-1" disabled={habis || !!proses} onClick={() => simpan("tambah")}>
            <ShoppingBag size={14} /> {proses === "tambah" ? "Menambahkan..." : "Tambah ke Keranjang"}
          </button>
        </div>
        <button className="tombol-putih mt-2.5 w-full" disabled={habis || !!proses} onClick={() => simpan("beli")}>Beli Sekarang</button>
        {pesan && (
          <p role="status" className={`mt-2.5 text-[11.5px] ${pesan.jenis === "ok" ? "text-[#4D6B3F]" : "text-marun"}`}>{pesan.teks}</p>
        )}

        <ul className="mt-5 space-y-2 text-[11px] text-tinta-lembut">
          <li className="flex items-center gap-2.5"><Truck size={13} /> Dikirim dalam 1–2 hari kerja dari Surakarta</li>
          <li className="flex items-center gap-2.5"><RefreshCw size={13} /> Tukar ukuran tersedia 7 hari setelah diterima</li>
          <li className="flex items-center gap-2.5"><ShieldCheck size={13} /> Produk autentik · Pembayaran aman</li>
        </ul>

        <div className="mt-5">
          {[["Bahan & Detail", p.bahan_detail], ["Cara Perawatan", p.perawatan]].map(([judul, isi]) => (
            <details key={judul} open className="border-t border-garis py-3">
              <summary className="cursor-pointer list-none text-[12px] font-semibold">{judul}</summary>
              <p className="mt-2 text-[11px] leading-relaxed text-tinta-lembut">{isi}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
