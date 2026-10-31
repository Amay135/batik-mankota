import type { Ukuran, Warna } from "./katalog";

export interface ItemKeranjang {
  id: number;
  jumlah: number;
  varian: { id: number; sku: string; warna: Warna; ukuran: Ukuran; stok?: number; status_stok?: "Tersedia" | "Tinggal sedikit" | "Habis" };
  produk: { slug: string; nama: string; motif: string; bentuk: string; warna_utama: Warna; foto_utama: string | null };
  harga: number;
  subtotal: number;
}

export interface Ringkasan {
  jumlah_produk: number;
  jumlah_barang: number;
  subtotal: number;
  ongkir: number;
  promo_ongkir: number;
  diskon_voucher: number;
  kode_voucher: string;
  voucher_galat: string | null;
  total: number;
  gratis_ongkir_min: number;
}

export interface Keranjang {
  item: ItemKeranjang[];
  ringkasan: Ringkasan;
}

export interface Pesanan {
  nomor: string;
  status: string;
  status_label: string;
  nama_lengkap: string;
  whatsapp: string;
  email: string;
  alamat: string;
  provinsi: string;
  kota: string;
  kecamatan: string;
  kode_pos: string;
  kurir: string;
  voucher_kode: string;
  subtotal: number;
  ongkir: number;
  promo_ongkir: number;
  diskon: number;
  total: number;
  metode_bayar: string;
  metode_label: string;
  bank: string;
  nomor_va: string;
  batas_bayar: string;
  dibuat: string;
  item: { nama: string; slug: string; motif: string; bentuk: string; warna: string; ukuran: string; sku: string; harga: number; jumlah: number; subtotal: number }[];
}

export type { Pengguna } from "./skema";
