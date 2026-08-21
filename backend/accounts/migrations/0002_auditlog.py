from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[('created', 'Tạo mới'), ('updated', 'Cập nhật'), ('deleted', 'Xóa'), ('stock_changed', 'Thay đổi tồn kho')], max_length=30)),
                ('entity_type', models.CharField(max_length=50)),
                ('entity_id', models.CharField(max_length=50)),
                ('summary', models.CharField(max_length=500)),
                ('changes', models.JSONField(default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['entity_type', 'entity_id'], name='auditlog_entity_idx'),
                    models.Index(fields=['created_at'], name='auditlog_created_idx'),
                ],
            },
        ),
    ]
