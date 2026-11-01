import re
from pathlib import Path

APPS = Path(__file__).resolve().parents[1] / "apps"
POLA = re.compile(r"\b(qty_on_hand|qty_reserved)\b")
# App inventory adalah pemilik field; migrasi dan tes boleh menyebut nama field.
DIIZINKAN = {"inventory"}


def test_tidak_ada_akses_qty_stok_di_luar_inventory():
    pelanggar = []
    for path in APPS.rglob("*.py"):
        rel = path.relative_to(APPS)
        if rel.parts[0] in DIIZINKAN:
            continue
        if "migrations" in rel.parts or "tests" in rel.parts:
            continue
        if POLA.search(path.read_text(encoding="utf-8")):
            pelanggar.append(str(rel))

    assert not pelanggar, (
        "Akses qty_on_hand/qty_reserved harus lewat apps/inventory: "
        + ", ".join(pelanggar)
    )
