from django.db import migrations

BUAT = """
CREATE OR REPLACE FUNCTION inventory_stockmovement_append_only()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'StockMovement bersifat append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_stockmovement_append_only
BEFORE UPDATE OR DELETE ON inventory_stockmovement
FOR EACH ROW EXECUTE FUNCTION inventory_stockmovement_append_only();
"""

HAPUS = """
DROP TRIGGER IF EXISTS inventory_stockmovement_append_only
ON inventory_stockmovement;
DROP FUNCTION IF EXISTS inventory_stockmovement_append_only();
"""


def pasang_trigger(apps, schema_editor):
    # Hanya PostgreSQL: trigger DELETE di SQLite memblokir flush test Django.
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute(BUAT)


def lepas_trigger(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute(HAPUS)


class Migration(migrations.Migration):
    dependencies = [("inventory", "0002_backfill_stock")]

    operations = [migrations.RunPython(pasang_trigger, lepas_trigger)]
