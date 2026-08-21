from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Customer, Order


@receiver(post_save, sender=Order)
def sync_customer(sender, instance, **kwargs):
    Customer.objects.update_or_create(
        customer_phone=instance.customer_phone,
        defaults={'customer_name': instance.customer_name},
    )
