from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('products', '0003_brand_is_active_category_is_active'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='cost_price',
            field=models.DecimalField(
                decimal_places=0,
                default=0,
                max_digits=12,
                verbose_name='Giá vốn (VNĐ)',
            ),
        ),
    ]
