export const rupiah = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");

const ZONA = "Asia/Jakarta";

/** Tanggal + jam WIB, mis. "20 Okt 2026, 10.00". */
export const waktuJakarta = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: ZONA });

/** Tanggal WIB saja, mis. "20 Okt 2026". */
export const tanggalJakarta = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: ZONA });

export const NAMA_WARNA: Record<string, string> = { indigo: "Indigo", soga: "Soga", krem: "Krem", hitam: "Hitam" };

export const WARNA_HEX: Record<string, string> = {
  indigo: "#2C3E6B",
  soga: "#A0602F",
  krem: "#EADFC6",
  hitam: "#262120",
};
