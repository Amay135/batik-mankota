from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.catalog.models import Varian

from .models import Stock


@receiver(post_save, sender=Varian)
def buat_stock_varian(sender, instance, created, **kwargs):
    if created:
        Stock.objects.get_or_create(variant=instance)
