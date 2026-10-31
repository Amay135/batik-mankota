// User hanya menerima status_stok; beri batas stepper tanpa menebak angka stok.
export const BATAS_TANPA_STOK = 10;

export function batasJumlah(v: { stok?: number; status_stok?: string }): number {
  if (v.stok !== undefined) return v.stok;
  if (v.status_stok === "Habis") return 0;
  if (v.status_stok === "Tinggal sedikit") return 5;
  return BATAS_TANPA_STOK;
}
