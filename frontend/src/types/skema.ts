import type { components } from "./api";

type Skema = components["schemas"];

export type Pengguna = Skema["User"];
export type BarisAudit = Skema["AuditLog"];
export type HalamanAudit = Skema["PaginatedAuditLogList"];
export type Role = Skema["RoleEnum"];

// shortcut: view APIView akun/2FA tidak punya serializer_class sehingga bentuk
// responsnya tidak ada di skema OpenAPI. Samakan dengan apps/accounts/serializers.py.
export type Akun = {
  id: number;
  email: string;
  nama_lengkap: string;
  whatsapp: string;
  role: Exclude<Role, "user">;
  is_active: boolean;
  otp_enabled: boolean;
};

export type AkunBaru = {
  email: string;
  password: string;
  nama_lengkap: string;
  whatsapp?: string;
  role: Exclude<Role, "user">;
};

export type UbahAkun = Partial<Pick<Akun, "nama_lengkap" | "whatsapp" | "role" | "is_active">>;

export type Setup2fa = { secret: string; otpauth_uri: string };
export type HasilVerifikasi2fa = { otp_enabled: boolean };
