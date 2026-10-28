import { describe, expect, it } from "vitest";

import type { HalamanAudit } from "@/types/skema";

import { BATAS_HALAMAN_AUDIT, muatSemuaAudit } from "./audit";

function halaman(nomor: number, adaBerikut: boolean) {
  return {
    count: 0,
    next: adaBerikut ? `http://contoh/api/v1/audit/?page=${nomor + 1}` : null,
    previous: null,
    results: [{ id: nomor }],
  } as unknown as HalamanAudit;
}

describe("muatSemuaAudit", () => {
  it("berhenti saat next kosong", async () => {
    const diminta: number[] = [];
    const hasil = await muatSemuaAudit(async (h) => {
      diminta.push(h);
      return halaman(h, h < 3);
    });
    expect(diminta).toEqual([1, 2, 3]);
    expect(hasil.baris).toHaveLength(3);
    expect(hasil.terpotong).toBe(false);
  });

  it("berhenti di batas 50 halaman dan menandai terpotong", async () => {
    const hasil = await muatSemuaAudit(async (h) => halaman(h, true));
    expect(BATAS_HALAMAN_AUDIT).toBe(50);
    expect(hasil.baris).toHaveLength(50);
    expect(hasil.terpotong).toBe(true);
  });
});
