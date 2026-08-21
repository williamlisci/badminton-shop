from django.conf import settings
from django.db import models


class StaffProfile(models.Model):
    class Role(models.TextChoices):
        OWNER = 'owner', 'Chủ shop'
        PRODUCT_MANAGER = 'product_manager', 'Quản lý sản phẩm'
        ORDER_MANAGER = 'order_manager', 'Xử lý đơn'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='staff_profile',
    )
    role = models.CharField(max_length=30, choices=Role.choices, default=Role.OWNER)

    def __str__(self):
        return f'{self.user.username} ({self.get_role_display()})'


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATED = 'created', 'Tạo mới'
        UPDATED = 'updated', 'Cập nhật'
        DELETED = 'deleted', 'Xóa'
        STOCK_CHANGED = 'stock_changed', 'Thay đổi tồn kho'

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='audit_logs',
    )
    action = models.CharField(max_length=30, choices=Action.choices)
    entity_type = models.CharField(max_length=50)
    entity_id = models.CharField(max_length=50)
    summary = models.CharField(max_length=500)
    changes = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['entity_type', 'entity_id'], name='auditlog_entity_idx'),
            models.Index(fields=['created_at'], name='auditlog_created_idx'),
        ]


class ShippingAddress(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='shipping_addresses',
    )
    label = models.CharField(max_length=80, default='Nhà riêng')
    recipient_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    address = models.TextField()
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_default', '-created_at']


class WishlistItem(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wishlist_items',
    )
    product = models.ForeignKey(
        'products.Product', on_delete=models.CASCADE, related_name='wishlisted_by',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['user', 'product'], name='unique_user_wishlist_product'),
        ]
