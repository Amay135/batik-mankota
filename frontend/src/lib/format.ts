export const rupiah = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");

export const NAMA_WARNA: Record<string, string> = { indigo: "Indigo", soga: "Soga", krem: "Krem", hitam: "Hitam" };

export const WARNA_HEX: Record<string, string> = {
  indigo: "#2C3E6B",
  soga: "#A0602F",
  krem: "#EADFC6",
  hitam: "#262120",
};
