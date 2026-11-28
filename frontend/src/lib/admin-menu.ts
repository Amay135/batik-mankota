export type ItemMenu = {
  /** Id kapabilitas di backend/apps/accounts/admin_scope.py; kosong bila halaman tanpa API terkunci. */
  id?: string;
  label: string;
  /** Kosong = belum tersedia; dirender nonaktif, bukan tautan ke halaman kosong. */
  href?: string;
};

export type GrupMenu = { judul: string; item: ItemMenu[] };

/** Sidebar dashboard admin: hanya fitur yang sudah ada, sisanya penanda "Segera". */
export const ADMIN_MENU: GrupMenu[] = [
  { judul: "Dashboard", item: [{ label: "Dashboard", href: "/dashboard" }] },
  {
    judul: "Manajemen",
    item: [
      { label: "Pesanan" },
      { id: "ADM-10", label: "Produk", href: "/dashboard/produk" },
      { id: "ADM-12", label: "Inventaris", href: "/dashboard/inventaris" },
      { id: "ADM-15", label: "Ulasan", href: "/dashboard/ulasan" },
      { id: "ADM-16", label: "Panduan Ukuran", href: "/dashboard/panduan-ukuran" },
      { label: "Pengadaan" },
      { id: "ADM-18", label: "Pelanggan", href: "/dashboard/pelanggan" },
    ],
  },
  { judul: "Bisnis", item: [{ label: "Keuangan" }, { label: "Laporan" }] },
  {
    judul: "Administrasi",
    item: [
      { id: "ADM-01", label: "Akun", href: "/dashboard/akun" },
      { id: "ADM-03", label: "Log Audit", href: "/dashboard/audit" },
      { label: "Pengaturan" },
    ],
  },
];

/** Tab halaman Inventaris; `id` = kapabilitas admin_scope.py yang dibuka tab tersebut. */
export const INVENTARIS_TABS = [
  { nilai: "stok", label: "Stok", id: "ADM-12" },
  { nilai: "mutasi", label: "Mutasi Stok", id: "ADM-12" },
  { nilai: "opname", label: "Opname", id: "ADM-13" },
  { nilai: "menipis", label: "Stok Menipis", id: "ADM-14" },
  { nilai: "label", label: "Label QR", id: "ADM-11" },
] as const;
