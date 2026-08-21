from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from .models import StaffProfile


@receiver(post_save, sender=get_user_model())
def create_staff_profile(sender, instance, created, **kwargs):
    if created and (instance.is_staff or instance.is_superuser):
        StaffProfile.objects.get_or_create(
            user=instance,
            defaults={'role': StaffProfile.Role.OWNER},
        )
