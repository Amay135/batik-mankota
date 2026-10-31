export type Teknik = "tulis" | "cap" | "kombinasi";
export type Warna = "indigo" | "soga" | "krem" | "hitam";
export type Ukuran = "S" | "M" | "L" | "XL" | "XXL" | "ALL";

export interface ProdukRingkas {
  id: number;
  slug: string;
  nama: string;
  kategori: { slug: string; nama: string; label_pendek: string };
  teknik: Teknik;
  teknik_label: string;
  label: string;
  harga: number;
  unggulan: boolean;
  motif: string;
  bentuk: string;
  warna_utama: Warna;
  foto_utama: string | null;
}

export interface Varian {
  id: number;
  warna: Warna;
  ukuran: Ukuran;
  sku: string;
  stok?: number;
  status_stok?: "Tersedia" | "Tinggal sedikit" | "Habis";
}

export interface ProdukDetail extends ProdukRingkas {
  deskripsi: string;
  bahan_detail: string;
  perawatan: string;
  koleksi: string;
  perajin: string;
  cerita_judul: string;
  cerita_isi: string;
  rating: string;
  jumlah_ulasan: number;
  terjual: number;
  varian: Varian[];
  foto: { jenis: "depan" | "detail" | "belakang" | "model"; url: string | null }[];
  tersedia: boolean;
  terkait: ProdukRingkas[];
}

export interface HasilKatalog {
  jumlah: number;
  halaman: number;
  per_halaman: number;
  total_halaman: number;
  dari: number;
  sampai: number;
  hasil: ProdukRingkas[];
  meta: { total_produk: number; total_perajin: number; harga_min: number; harga_maks: number };
}

export interface DataKategori {
  total: number;
  kategori: { slug: string; nama: string; label_pendek: string; jumlah: number }[];
}
