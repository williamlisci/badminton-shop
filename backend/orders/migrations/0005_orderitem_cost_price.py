from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('orders', '0004_customer'),
    ]

    operations = [
        migrations.AddField(
            model_name='orderitem',
            name='cost_price',
            field=models.DecimalField(
                decimal_places=0,
                default=0,
                max_digits=12,
                verbose_name='Giá vốn tại thời điểm mua',
            ),
        ),
    ]
