import { describe, expect, it } from "vitest";

import { rupiah, tanggalJakarta, waktuJakarta } from "./format";

describe("rupiah", () => {
  it("membulatkan ke integer tanpa desimal", () => {
    expect(rupiah(1234567)).toBe("Rp1.234.567");
    expect(rupiah(1000.4)).toBe("Rp1.000");
  });
});

describe("format tanggal Asia/Jakarta", () => {
  it("menggeser tanggal ke WIB", () => {
    expect(tanggalJakarta("2026-10-20T17:00:00Z")).toBe("21 Okt 2026");
  });

  it("menampilkan jam WIB", () => {
    expect(waktuJakarta("2026-10-20T03:00:00Z")).toBe("20 Okt 2026, 10.00");
  });
});
