import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { ADMIN_MENU } from "./admin-menu";

const HARAPAN_FASE_0 = ["ADM-01", "ADM-03"];

const scope = readFileSync(
  fileURLToPath(new URL("../../../backend/apps/accounts/admin_scope.py", import.meta.url)),
  "utf8",
);

function faseDiRegistry() {
  const hasil: Record<string, number> = {};
  for (const [, id, fase] of scope.matchAll(/"id":\s*"([^"]+)"[\s\S]*?"fase":\s*(\d+)/g)) {
    hasil[id] = Number(fase);
  }
  return hasil;
}

describe("ADMIN_MENU", () => {
  it("berisi persis id untuk fase 0", () => {
    expect(ADMIN_MENU.map((m) => m.id)).toEqual(HARAPAN_FASE_0);
  });

  it("tiap id ada di admin_scope.py dengan fase <= 0", () => {
    const fase = faseDiRegistry();
    for (const id of HARAPAN_FASE_0) {
      expect(fase[id], `${id} tidak ada di admin_scope.py`).toBeDefined();
      expect(fase[id]).toBeLessThanOrEqual(0);
    }
  });
});
