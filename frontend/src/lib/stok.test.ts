import { describe, expect, it } from "vitest";

import { BATAS_TANPA_STOK, batasJumlah } from "./stok";

describe("batasJumlah", () => {
  it("memakai stok angka bila tersedia", () => {
    expect(batasJumlah({ stok: 24 })).toBe(24);
    expect(batasJumlah({ stok: 0 })).toBe(0);
  });

  it("memakai batas aman dari status tanpa angka stok", () => {
    expect(batasJumlah({ status_stok: "Habis" })).toBe(0);
    expect(batasJumlah({ status_stok: "Tinggal sedikit" })).toBe(5);
    expect(batasJumlah({ status_stok: "Tersedia" })).toBe(BATAS_TANPA_STOK);
  });
});
