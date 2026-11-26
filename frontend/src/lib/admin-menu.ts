/** Menu dashboard, hanya item yang punya entri admin_scope.py fase <= 1. */
export const ADMIN_MENU = [
  { id: "ADM-01", label: "Akun", href: "/dashboard" },
  { id: "ADM-03", label: "Log Audit", href: "/dashboard/audit" },
  { id: "ADM-10", label: "Produk", href: "/dashboard/produk" },
  { id: "ADM-11", label: "Label QR", href: "/dashboard/label" },
  { id: "ADM-12", label: "Stok", href: "/dashboard/stok" },
  { id: "ADM-13", label: "Opname", href: "/dashboard/opname" },
  { id: "ADM-14", label: "Stok Menipis", href: "/dashboard/stok-menipis" },
  { id: "ADM-15", label: "Ulasan", href: "/dashboard/ulasan" },
  { id: "ADM-16", label: "Panduan Ukuran", href: "/dashboard/panduan-ukuran" },
] as const;
