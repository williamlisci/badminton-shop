from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('orders', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='cancellation_reason',
            field=models.TextField(
                blank=True,
                default='',
                verbose_name='Lý do hủy',
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='internal_note',
            field=models.TextField(
                blank=True,
                default='',
                verbose_name='Ghi chú nội bộ',
            ),
        ),
        migrations.CreateModel(
            name='OrderStatusHistory',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                ('from_status', models.CharField(
                    blank=True,
                    default='',
                    max_length=20,
                )),
                ('to_status', models.CharField(max_length=20)),
                ('reason', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                (
                    'changed_by',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='order_status_changes',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    'order',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='status_history',
                        to='orders.order',
                        verbose_name='Đơn hàng',
                    ),
                ),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]
