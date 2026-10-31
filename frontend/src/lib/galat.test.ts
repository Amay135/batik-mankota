import { describe, expect, it } from "vitest";

import { ApiError } from "./api";
import { aksiGalat } from "./galat";

describe("aksiGalat", () => {
  it("membiarkan 401 ditangani api()", () => {
    expect(aksiGalat(new ApiError(401, {}))).toEqual({});
  });

  it("mengarahkan 403 ke verifikasi 2FA", () => {
    expect(aksiGalat(new ApiError(403, {}))).toEqual({ tujuan: "/verifikasi-2fa" });
  });

  it("memberi pesan untuk 429", () => {
    expect(aksiGalat(new ApiError(429, {})).pesan).toBe("Terlalu banyak permintaan. Coba lagi sebentar lagi.");
  });

  it("memakai pesan galat lain", () => {
    expect(aksiGalat(new ApiError(500, { detail: "Server bermasalah." }))).toEqual({ pesan: "Server bermasalah." });
  });

  it("memberi pesan umum untuk galat non-API", () => {
    expect(aksiGalat(new Error("x"))).toEqual({ pesan: "Terjadi kesalahan. Coba lagi." });
  });
});
