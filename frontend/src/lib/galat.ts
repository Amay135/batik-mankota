import { ApiError } from "./api";

export type AksiGalat = { tujuan?: string; pesan?: string };

/** Aksi seragam untuk galat query/mutation dashboard. 401 sudah ditangani `api()`. */
export function aksiGalat(err: unknown): AksiGalat {
  if (!(err instanceof ApiError)) return { pesan: "Terjadi kesalahan. Coba lagi." };
  if (err.status === 401) return {};
  if (err.status === 403) return { tujuan: "/verifikasi-2fa" };
  if (err.status === 429) return { pesan: "Terlalu banyak permintaan. Coba lagi sebentar lagi." };
  return { pesan: err.message };
}
