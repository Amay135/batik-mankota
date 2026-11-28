import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { ADMIN_MENU, INVENTARIS_TABS } from "./admin-menu";

const HARAPAN_FASE_1 = [
  "ADM-01",
  "ADM-03",
  "ADM-10",
  "ADM-11",
  "ADM-12",
  "ADM-13",
  "ADM-14",
  "ADM-15",
  "ADM-16",
];

// Fitur yang sudah ada di fase berikutnya.
const FASE_MENU: Record<string, number> = {
  ...Object.fromEntries(HARAPAN_FASE_1.map((id) => [id, 1])),
  "ADM-01": 0,
  "ADM-03": 0,
  "ADM-18": 3,
};

const scope = readFileSync(
  fileURLToPath(new URL("../../../backend/apps/accounts/admin_scope.py", import.meta.url)),
  "utf8",
);

const SEMUA_ITEM = ADMIN_MENU.flatMap((grup) => grup.item);

function faseDiRegistry() {
  const hasil: Record<string, number> = {};
  for (const [, id, fase] of scope.matchAll(/"id":\s*"([^"]+)"[\s\S]*?"fase":\s*(\d+)/g)) {
    hasil[id] = Number(fase);
  }
  // ADM-11..16 didefinisikan lewat helper yang memakai id_= dan fase 1.
  for (const [, id] of scope.matchAll(/id_="([^"]+)"/g)) {
    hasil[id] = 1;
  }
  return hasil;
}

describe("ADMIN_MENU", () => {
  it("menu dan tab inventaris mencakup persis fitur yang tersedia", () => {
    const tampil = new Set([
      ...SEMUA_ITEM.flatMap((item) => (item.id ? [item.id] : [])),
      ...INVENTARIS_TABS.map((tab) => tab.id),
    ]);
    expect([...tampil].sort()).toEqual([...Object.keys(FASE_MENU)].sort());
  });

  it("tiap id ada di admin_scope.py sesuai fasenya", () => {
    const fase = faseDiRegistry();
    for (const [id, harapan] of Object.entries(FASE_MENU)) {
      expect(fase[id], `${id} tidak ada di admin_scope.py`).toBeDefined();
      expect(fase[id]).toBe(harapan);
    }
  });

  it("fitur yang belum tersedia tidak punya tautan", () => {
    expect(SEMUA_ITEM.filter((item) => !item.href).map((item) => item.label)).toEqual([
      "Pesanan",
      "Pengadaan",
      "Keuangan",
      "Laporan",
      "Pengaturan",
    ]);
  });

  it("menautkan ke rute dashboard yang unik", () => {
    const href = SEMUA_ITEM.flatMap((item) => (item.href ? [item.href] : []));
    expect(new Set(href).size).toBe(href.length);
    for (const h of href) expect(h).toMatch(/^\/dashboard(\/|$)/);
  });

  it("tidak menampilkan POS, kasir, member, atau loyalitas", () => {
    const teks = SEMUA_ITEM.map((item) => item.label.toLowerCase()).join(" ");
    for (const kata of ["kasir", "pos", "member", "tier", "poin", "loyalty"]) {
      expect(teks).not.toContain(kata);
    }
  });
});
