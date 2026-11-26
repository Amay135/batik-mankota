export type FilterProduk = { q: string; kategori: string; motif: string; aktif: string };
export type FilterUlasan = { produk: string; rating: string; tampil: string };

/** Filter klien untuk tabel produk admin (endpoint kelola tidak punya parameter filter). */
export function saringProduk<
  T extends { nama: string; kategori: number; motif: string; aktif?: boolean },
>(daftar: T[], f: FilterProduk): T[] {
  const q = f.q.trim().toLowerCase();
  return daftar.filter(
    (p) =>
      (!q || p.nama.toLowerCase().includes(q)) &&
      (!f.kategori || String(p.kategori) === f.kategori) &&
      (!f.motif || p.motif === f.motif) &&
      (f.aktif === "" || String(p.aktif ?? true) === f.aktif),
  );
}

/** Filter klien untuk tabel ulasan admin (endpoint kelola tidak punya parameter filter). */
export function saringUlasan<T extends { produk: string; rating: number; tampil?: boolean }>(
  daftar: T[],
  f: FilterUlasan,
): T[] {
  return daftar.filter(
    (u) =>
      (!f.produk || u.produk === f.produk) &&
      (!f.rating || String(u.rating) === f.rating) &&
      (f.tampil === "" || String(u.tampil ?? true) === f.tampil),
  );
}
