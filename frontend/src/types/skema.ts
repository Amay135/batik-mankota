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
