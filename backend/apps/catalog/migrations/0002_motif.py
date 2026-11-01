import django.db.models.deletion
from django.db import migrations, models


def slug_ke_motif(apps, schema_editor):
    Produk = apps.get_model("catalog", "Produk")
    Motif = apps.get_model("catalog", "Motif")
    for slug in Produk.objects.values_list("motif", flat=True).distinct():
        if not slug:
            continue
        motif, _ = Motif.objects.get_or_create(
            slug=slug, defaults={"nama": slug.replace("-", " ").title()}
        )
        Produk.objects.filter(motif=slug).update(motif_fk=motif)


def motif_ke_slug(apps, schema_editor):
    Produk = apps.get_model("catalog", "Produk")
    for produk in Produk.objects.select_related("motif_fk"):
        produk.motif = produk.motif_fk.slug if produk.motif_fk else ""
        produk.save(update_fields=["motif"])


class Migration(migrations.Migration):
    dependencies = [("catalog", "0001_initial")]

    operations = [
        migrations.CreateModel(
            name="Motif",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("nama", models.CharField(max_length=60)),
                ("slug", models.SlugField(unique=True)),
                ("deskripsi", models.TextField(blank=True)),
            ],
            options={"verbose_name_plural": "motif", "ordering": ["nama"]},
        ),
        migrations.AddField(
            model_name="produk",
            name="motif_fk",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="produk",
                to="catalog.motif",
            ),
        ),
        migrations.RunPython(slug_ke_motif, motif_ke_slug),
        migrations.RemoveField(model_name="produk", name="motif"),
        migrations.RenameField(
            model_name="produk", old_name="motif_fk", new_name="motif"
        ),
        migrations.AlterField(
            model_name="produk",
            name="motif",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="produk",
                to="catalog.motif",
            ),
        ),
    ]
