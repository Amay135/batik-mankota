import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { ADMIN_MENU } from "./admin-menu";

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

const scope = readFileSync(
  fileURLToPath(new URL("../../../backend/apps/accounts/admin_scope.py", import.meta.url)),
  "utf8",
);

function faseDiRegistry() {
  const hasil: Record<string, number> = {};
  for (const [, id, fase] of scope.matchAll(/"id":\s*"([^"]+)"[\s\S]*?"fase":\s*(\d+)/g)) {
    hasil[id] = Number(fase);
  }
  // ADM-12..16 didefinisikan lewat helper yang memakai id_= dan fase 1.
  for (const [, id] of scope.matchAll(/id_="([^"]+)"/g)) {
    hasil[id] = 1;
  }
  return hasil;
}

describe("ADMIN_MENU", () => {
  it("berisi persis id untuk fase 1", () => {
    expect(ADMIN_MENU.map((m) => m.id)).toEqual(HARAPAN_FASE_1);
  });

  it("tiap id ada di admin_scope.py dengan fase <= 1", () => {
    const fase = faseDiRegistry();
    for (const id of HARAPAN_FASE_1) {
      expect(fase[id], `${id} tidak ada di admin_scope.py`).toBeDefined();
      expect(fase[id]).toBeLessThanOrEqual(1);
    }
  });
});
