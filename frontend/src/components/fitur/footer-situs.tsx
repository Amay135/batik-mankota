import Link from "next/link";

import { Ornamen } from "@/components/ui/ornamen";
import { SITUS } from "@/lib/situs";

const JELAJAHI = [
  ["Semua Koleksi", "/koleksi"],
  ["Batik Pria", "/koleksi?kategori=batik-pria"],
  ["Batik Wanita", "/koleksi?kategori=batik-wanita"],
  ["Kain Batik", "/koleksi?kategori=kain-batik"],
];
const BANTUAN = ["Panduan Ukuran", "Pengiriman & Retur", "Cara Perawatan", "Hubungi Kami"];

export function FooterSitus() {
  const kepala = "mb-4 text-[12px] font-semibold text-krem";
  const tautan = "block text-[11.5px] leading-[2.1] text-krem/75 hover:text-krem";
  return (
    <footer className="bg-marun text-krem">
      <div className="wadah pb-6 pt-12">
        <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] gap-10">
          <div>
            <div className="flex items-center gap-2">
              <Ornamen size={26} />
              <span className="leading-none">
                <span className="block font-serif text-[26px] font-medium">Mankota</span>
                <span className="mt-0.5 block text-[6.5px] uppercase tracking-[0.18em] text-krem/70">Batik • Warisan Nusantara</span>
              </span>
            </div>
            <p className="mt-5 max-w-[250px] text-[12px] leading-relaxed text-krem/85">
              Merawat warisan, merayakan keseharian. Batik pilihan dengan cerita yang layak dikenakan.
            </p>
            <p className="mt-5 text-[11px] text-krem/70">{SITUS.alamat}</p>
          </div>
          <div>
            <h4 className={kepala}>Jelajahi</h4>
            {JELAJAHI.map(([l, h]) => <Link key={l} href={h} className={tautan}>{l}</Link>)}
          </div>
          <div>
            <h4 className={kepala}>Bantuan</h4>
            {BANTUAN.map((l) => <a key={l} href="#" className={tautan}>{l}</a>)}
          </div>
          <div>
            <h4 className={kepala}>Mari terhubung</h4>
            <a href={SITUS.waLink} className={tautan}>WhatsApp {SITUS.wa}</a>
            <a href={`mailto:${SITUS.email}`} className={tautan}>{SITUS.email}</a>
            <span className={tautan}>Instagram {SITUS.instagram}</span>
            <span className={tautan}>{SITUS.jamLayanan}</span>
          </div>
        </div>
        <div className="mt-10 flex items-center justify-between border-t border-krem/20 pt-5 text-[10.5px] text-krem/70">
          <span>© 2026 Batik Mankota. Dibuat dengan rasa, dikerjakan dengan cinta.</span>
          <span className="flex gap-6">
            <a href="#" className="hover:text-krem">Kebijakan Privasi</a>
            <a href="#" className="hover:text-krem">Syarat &amp; Ketentuan</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
