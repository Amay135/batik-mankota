"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { SITUS } from "@/lib/situs";
import { rupiah } from "@/lib/format";

export function useUbahQuery() {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  return useCallback(
    (ubah: Record<string, string | string[] | null>, resetHalaman = true) => {
      const q = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(ubah)) {
        q.delete(k);
        if (Array.isArray(v)) v.forEach((x) => q.append(k, x));
        else if (v) q.set(k, v);
      }
      if (resetHalaman) q.delete("halaman");
      const s = q.toString();
      router.push(s ? `${path}?${s}` : path, { scroll: false });
    },
    [sp, router, path],
  );
}

interface Props {
  kategori: { slug: string; nama: string; jumlah: number }[];
  total: number;
  hargaMin: number;
  hargaMaks: number;
}

const TEKNIK = [["tulis", "Batik Tulis"], ["cap", "Batik Cap"], ["kombinasi", "Kombinasi"]];
const UKURAN = ["S", "M", "L", "XL", "XXL"];
const WARNA = [["indigo", "Indigo"], ["soga", "Soga"], ["krem", "Krem"], ["hitam", "Hitam"]];

function Grup({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-garis py-4">
      <h4 className="mb-3 text-[11.5px] font-semibold text-tinta">{judul}</h4>
      {children}
    </section>
  );
}

function Centang({ nama, nilai, label }: { nama: string; nilai: string; label: string }) {
  const sp = useSearchParams();
  const ubah = useUbahQuery();
  const terpilih = sp.getAll(nama);
  const aktif = terpilih.includes(nilai);
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-[5px] text-[11.5px] text-tinta-lembut hover:text-tinta">
      <input
        type="checkbox" className="bulat" checked={aktif}
        onChange={() => ubah({ [nama]: aktif ? terpilih.filter((x) => x !== nilai) : [...terpilih, nilai] })}
      />
      {label}
    </label>
  );
}

export function FilterSamping({ kategori, total, hargaMin, hargaMaks }: Props) {
  const sp = useSearchParams();
  const ubah = useUbahQuery();
  const aktifKat = sp.get("kategori");

  const dariUrl = [Number(sp.get("harga_min")) || hargaMin, Number(sp.get("harga_maks")) || hargaMaks] as const;
  const [lo, setLo] = useState<number>(dariUrl[0]);
  const [hi, setHi] = useState<number>(dariUrl[1]);
  const [teksLo, setTeksLo] = useState(rupiah(dariUrl[0]));
  const [teksHi, setTeksHi] = useState(rupiah(dariUrl[1]));
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sinkron bila URL berubah dari luar (Reset, back/forward).
  useEffect(() => {
    setLo(dariUrl[0]); setHi(dariUrl[1]);
    setTeksLo(rupiah(dariUrl[0])); setTeksHi(rupiah(dariUrl[1]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.get("harga_min"), sp.get("harga_maks"), hargaMin, hargaMaks]);

  function terapkan(a: number, b: number) {
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => ubah({ harga_min: a > hargaMin ? String(a) : null, harga_maks: b < hargaMaks ? String(b) : null }),
      350,
    );
  }
  function ubahLo(v: number) {
    const n = Math.min(Math.max(v, hargaMin), hi - 5000);
    setLo(n); setTeksLo(rupiah(n)); terapkan(n, hi);
  }
  function ubahHi(v: number) {
    const n = Math.max(Math.min(v, hargaMaks), lo + 5000);
    setHi(n); setTeksHi(rupiah(n)); terapkan(lo, n);
  }
  const angka = (s: string) => Number(s.replace(/\D/g, "")) || 0;
  const pct = (v: number) => ((v - hargaMin) / (hargaMaks - hargaMin || 1)) * 100;

  return (
    <aside className="flex flex-col">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-sans text-[13px] font-semibold">Filter</h3>
        <button onClick={() => ubah({ kategori: null, harga_min: null, harga_maks: null, teknik: null, ukuran: null, warna: null, q: null })} className="text-[11px] text-tinta-lembut hover:text-marun">
          Reset
        </button>
      </div>

      <Grup judul="Kategori">
        <ul>
          {[{ slug: "", nama: "Semua Produk", jumlah: total }, ...kategori].map((k) => {
            const aktif = (aktifKat ?? "") === k.slug;
            return (
              <li key={k.slug || "semua"}>
                <button onClick={() => ubah({ kategori: k.slug || null })}
                  className={`flex w-full items-center justify-between py-[5px] text-[11.5px] ${aktif ? "font-semibold text-tinta" : "text-tinta-lembut hover:text-tinta"}`}>
                  <span>{k.nama}</span><span className="text-[10.5px]">{k.jumlah}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Grup>

      <Grup judul="Rentang Harga">
        <div className="flex gap-2">
          {[[teksLo, setTeksLo, ubahLo], [teksHi, setTeksHi, ubahHi]].map(([val, set, commit], i) => (
            <input key={i} aria-label={i ? "Harga maksimum" : "Harga minimum"} value={val as string}
              onChange={(e) => (set as (s: string) => void)(e.target.value)}
              onBlur={(e) => (commit as (n: number) => void)(angka(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="h-8 w-full min-w-0 rounded border border-garis bg-white px-2 text-[11px] focus:border-marun focus:outline-none" />
          ))}
        </div>
        <div className="relative mt-4 h-[14px]">
          <div className="absolute left-0 right-0 top-[6px] h-[2px] rounded bg-garis" />
          <div className="absolute top-[6px] h-[2px] rounded bg-marun" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
          <input type="range" className="rentang" min={hargaMin} max={hargaMaks} step={5000} value={lo} aria-label="Harga minimum"
            onChange={(e) => ubahLo(+e.target.value)} />
          <input type="range" className="rentang" min={hargaMin} max={hargaMaks} step={5000} value={hi} aria-label="Harga maksimum"
            onChange={(e) => ubahHi(+e.target.value)} />
        </div>
      </Grup>

      <Grup judul="Teknik">{TEKNIK.map(([v, l]) => <Centang key={v} nama="teknik" nilai={v} label={l} />)}</Grup>
      <Grup judul="Ukuran">{UKURAN.map((u) => <Centang key={u} nama="ukuran" nilai={u} label={u} />)}</Grup>
      <Grup judul="Warna">{WARNA.map(([v, l]) => <Centang key={v} nama="warna" nilai={v} label={l} />)}</Grup>

      <div className="mt-auto border-t border-garis pt-5">
        <h4 className="font-serif text-[17px]">Bingung memilih?</h4>
        <p className="mt-1.5 text-[10.5px] leading-relaxed text-tinta-lembut">
          Kami bantu menemukan motif dan ukuran yang cocok untuk Anda.
        </p>
        <a href={SITUS.waLink} target="_blank" rel="noreferrer" className="mt-2.5 inline-block text-[11px] font-medium text-tinta hover:text-marun">
          Tanya via WhatsApp →
        </a>
      </div>
    </aside>
  );
}
