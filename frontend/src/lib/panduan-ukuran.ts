export type HasilValidasiTabel = { ok: true } | { ok: false; pesan: string };

/** Sama dengan aturan PanduanUkuranAdminSerializer.validate_tabel di backend. */
export function validasiTabelPanduan(tabel: unknown): HasilValidasiTabel {
  if (!Array.isArray(tabel) || tabel.length < 2 || tabel.length > 20) {
    return { ok: false, pesan: "Tabel harus berisi 2 sampai 20 baris." };
  }
  if (!Array.isArray(tabel[0]) || tabel[0].length < 2 || tabel[0].length > 10) {
    return { ok: false, pesan: "Tabel harus berisi 2 sampai 10 kolom." };
  }
  const lebar = tabel[0].length;
  for (const baris of tabel) {
    if (!Array.isArray(baris) || baris.length !== lebar) {
      return { ok: false, pesan: "Semua baris harus sama panjang." };
    }
    if (baris.some((sel) => typeof sel !== "string" || sel.length > 20)) {
      return { ok: false, pesan: "Setiap sel harus teks maksimal 20 karakter." };
    }
  }
  return { ok: true };
}

/** Ubah tabel JSON dari API menjadi grid editor; kosongkan bila bentuknya tidak dikenal. */
export function keGrid(tabel: unknown): string[][] {
  return validasiTabelPanduan(tabel).ok ? (tabel as string[][]) : [];
}
