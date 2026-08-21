from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def assign_existing_staff_roles(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    Profile = apps.get_model('accounts', 'StaffProfile')
    for user in User.objects.filter(is_staff=True):
        Profile.objects.update_or_create(
            user_id=user.pk,
            defaults={'role': 'owner'},
        )


class Migration(migrations.Migration):
    initial = True
    dependencies = [('auth', '0012_alter_user_first_name_max_length')]
    operations = [
        migrations.CreateModel(
            name='StaffProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('owner', 'Chủ shop'), ('product_manager', 'Quản lý sản phẩm'), ('order_manager', 'Xử lý đơn')], default='owner', max_length=30)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='staff_profile', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.RunPython(assign_existing_staff_roles, migrations.RunPython.noop),
    ]
