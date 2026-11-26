import { describe, expect, it } from "vitest";

import { keGrid, validasiTabelPanduan } from "./panduan-ukuran";

const valid = [
  ["Ukuran", "Lingkar dada"],
  ["S", "90 cm"],
  ["M", "96 cm"],
];

describe("validasiTabelPanduan", () => {
  it("menerima tabel valid", () => {
    expect(validasiTabelPanduan(valid)).toEqual({ ok: true });
  });

  it("menolak jumlah baris di luar 2 sampai 20", () => {
    expect(validasiTabelPanduan([["A", "B"]]).ok).toBe(false);
    expect(validasiTabelPanduan(Array.from({ length: 21 }, () => ["A", "B"])).ok).toBe(false);
  });

  it("menolak jumlah kolom di luar 2 sampai 10", () => {
    expect(validasiTabelPanduan([["A"], ["B"]]).ok).toBe(false);
    expect(validasiTabelPanduan([Array(11).fill("A")]).ok).toBe(false);
  });

  it("menolak baris yang panjangnya berbeda", () => {
    expect(validasiTabelPanduan([["A", "B"], ["C"]]).ok).toBe(false);
  });

  it("menolak sel bukan teks atau lebih dari 20 karakter", () => {
    expect(validasiTabelPanduan([["A", "B"], ["C", 1]]).ok).toBe(false);
    expect(validasiTabelPanduan([["A", "B"], ["C", "x".repeat(21)]]).ok).toBe(false);
  });
});

describe("keGrid", () => {
  it("mengembalikan grid untuk tabel valid dan kosong untuk tabel rusak", () => {
    expect(keGrid(valid)).toEqual(valid);
    expect(keGrid({ bukan: "tabel" })).toEqual([]);
  });
});
