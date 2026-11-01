import secrets

import apps.catalog.models
from django.db import migrations, models


def isi_qr_token(apps, schema_editor):
    Varian = apps.get_model("catalog", "Varian")
    dipakai = set(
        Varian.objects.exclude(qr_token=None).values_list("qr_token", flat=True)
    )
    for varian in Varian.objects.filter(qr_token=None):
        token = secrets.token_urlsafe(12)
        while token in dipakai:
            token = secrets.token_urlsafe(12)
        dipakai.add(token)
        varian.qr_token = token
        varian.save(update_fields=["qr_token"])


class Migration(migrations.Migration):
    dependencies = [("catalog", "0002_motif")]

    operations = [
        migrations.AddField(
            model_name="varian",
            name="harga_beli",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Harga beli/HPP, Rupiah tanpa desimal; hanya untuk admin",
            ),
        ),
        migrations.AddField(
            model_name="varian",
            name="aktif",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="varian",
            name="qr_token",
            field=models.CharField(editable=False, max_length=32, null=True),
        ),
        migrations.RunPython(isi_qr_token, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="varian",
            name="qr_token",
            field=models.CharField(
                default=apps.catalog.models.generate_qr_token,
                editable=False,
                max_length=32,
                unique=True,
            ),
        ),
        migrations.AddField(
            model_name="fotoproduk",
            name="alt",
            field=models.CharField(blank=True, max_length=160),
        ),
    ]
