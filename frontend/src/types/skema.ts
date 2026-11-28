import type { components } from "./api";

type Skema = components["schemas"];

export type Pengguna = Skema["User"];
export type BarisAudit = Skema["AuditLog"];
export type HalamanAudit = Skema["PaginatedAuditLogList"];
export type Role = Skema["RoleEnum"];

// Endpoint akun hanya mengembalikan staff; skema model memuat "user".
export type Akun = Omit<Skema["AkunAdmin"], "role"> & { role: Exclude<Role, "user"> };
export type AkunBaru = Skema["BuatAkun"];
export type UbahAkun = Skema["PatchedUbahAkun"];
export type Setup2fa = Skema["Setup2fa"];
export type HasilVerifikasi2fa = Skema["HasilVerifikasi2fa"];

// Fase 1: katalog, stok, ulasan, panduan ukuran.
export type KategoriAdmin = Skema["KategoriAdmin"];
export type PatchedKategoriAdmin = Skema["PatchedKategoriAdmin"];
export type MotifAdmin = Skema["MotifAdmin"];
export type PatchedMotifAdmin = Skema["PatchedMotifAdmin"];
export type ProdukAdmin = Skema["ProdukAdmin"];
export type PatchedProdukAdmin = Skema["PatchedProdukAdmin"];
export type VarianAdmin = Skema["VarianAdmin"];
export type PatchedVarianAdmin = Skema["PatchedVarianAdmin"];
export type FotoAdmin = Skema["FotoAdmin"];
export type UlasanAdmin = Skema["UlasanAdmin"];
export type PanduanUkuranAdmin = Skema["PanduanUkuranAdmin"];
export type LabelCetak = Skema["LabelCetak"];
export type LabelCetakUkuran = Skema["LabelCetakUkuranEnum"];
export type Stok = Skema["Stok"];
export type HalamanStok = Skema["PaginatedStokList"];
export type Mutasi = Skema["Mutasi"];
export type HalamanMutasi = Skema["PaginatedMutasiList"];
export type Penyesuaian = Skema["Penyesuaian"];
export type BuatOpname = Skema["BuatOpname"];
export type Opname = Skema["Opname"];
export type OpnameItem = Skema["OpnameItem"];
export type OpnameRingkas = Skema["OpnameRingkas"];
export type HalamanOpname = Skema["PaginatedOpnameRingkasList"];

// Fase 2: ringkasan dashboard admin.
export type RingkasanDasbor = Skema["RingkasanDasbor"];
export type AktivitasDasbor = Skema["AktivitasDasbor"];

// Fase 3: pelanggan & riwayat pembelian (tanpa member/poin).
export type Pelanggan = Skema["Pelanggan"];
export type PelangganDetail = Skema["PelangganDetail"];
export type StatistikPelanggan = Skema["StatistikPelanggan"];
export type HalamanPelanggan = Skema["PaginatedPelangganList"];
export type RiwayatPesananPelanggan = Skema["PesananPelanggan"];
export type HalamanRiwayatPesanan = Skema["PaginatedPesananPelangganList"];
export type RingkasanPelanggan = Skema["RingkasanPelanggan"];

export type Galat = Skema["Galat"];
