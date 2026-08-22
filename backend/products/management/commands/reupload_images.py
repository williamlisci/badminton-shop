import os
from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand
from products.models import ProductImage


class Command(BaseCommand):
    help = "Re-upload existing local product images to Cloudinary"

    def handle(self, *args, **options):
        images = ProductImage.objects.all()
        success, missing = 0, 0

        for img in images:
            old_name = img.image.name
            local_path = os.path.join(settings.BASE_DIR, 'media', old_name)

            if os.path.exists(local_path):
                ext = os.path.splitext(old_name)[1]  # lấy đuôi file, vd '.jpg'
                short_name = f"product_{img.pk}{ext}"

                with open(local_path, 'rb') as f:
                    img.image.save(short_name, File(f), save=True)
                self.stdout.write(f"✅ Uploaded: {old_name} -> {short_name}")
                success += 1
            else:
                self.stdout.write(f"❌ Missing local file: {local_path}")
                missing += 1

        self.stdout.write(self.style.SUCCESS(f"\nDone. Success: {success}, Missing: {missing}"))
