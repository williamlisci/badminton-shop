from django.db import migrations, models


def create_customers_from_orders(apps, schema_editor):
    Customer = apps.get_model('orders', 'Customer')
    Order = apps.get_model('orders', 'Order')
    seen = set()
    for order in Order.objects.order_by('id').iterator():
        if order.customer_phone in seen:
            continue
        Customer.objects.create(
            customer_phone=order.customer_phone,
            customer_name=order.customer_name,
        )
        seen.add(order.customer_phone)


class Migration(migrations.Migration):
    dependencies = [
        ('orders', '0003_order_applied_discount_code_order_discount_amount_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Customer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('customer_name', models.CharField(max_length=255, verbose_name='Tên khách hàng')),
                ('customer_phone', models.CharField(max_length=20, unique=True, verbose_name='Số điện thoại')),
                ('note', models.TextField(blank=True, default='', verbose_name='Ghi chú')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ['-updated_at', 'customer_phone']},
        ),
        migrations.RunPython(create_customers_from_orders, migrations.RunPython.noop),
    ]
