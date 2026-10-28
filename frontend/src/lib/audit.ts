import type { BarisAudit, HalamanAudit } from "@/types/skema";

export const BATAS_HALAMAN_AUDIT = 50;

/**
 * shortcut: /api/v1/audit/ belum punya query filter, jadi semua halaman dimuat
 * lalu difilter di browser. Batas 50 halaman mencegah loop tanpa akhir.
 */
export async function muatSemuaAudit(
  ambil: (halaman: number) => Promise<HalamanAudit>,
): Promise<{ baris: BarisAudit[]; terpotong: boolean }> {
  const baris: BarisAudit[] = [];
  let halaman = 1;
  while (halaman <= BATAS_HALAMAN_AUDIT) {
    const data = await ambil(halaman);
    baris.push(...data.results);
    if (!data.next) return { baris, terpotong: false };
    halaman += 1;
  }
  return { baris, terpotong: true };
}
