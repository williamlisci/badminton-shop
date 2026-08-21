from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from products.models import Product


class Customer(models.Model):
    customer_name = models.CharField(max_length=255, verbose_name='Tên khách hàng')
    customer_phone = models.CharField(
        max_length=20, unique=True, verbose_name='Số điện thoại',
    )
    note = models.TextField(blank=True, default='', verbose_name='Ghi chú')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at', 'customer_phone']

    def __str__(self):
        return f'{self.customer_name} ({self.customer_phone})'


class Order(models.Model):
    user = models.ForeignKey(
        'auth.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='orders',
    )
    class Status(models.TextChoices):
        PENDING = 'pending', 'Chờ xác nhận'
        CONFIRMED = 'confirmed', 'Đã xác nhận'
        SHIPPING = 'shipping', 'Đang giao'
        COMPLETED = 'completed', 'Hoàn tất'
        CANCELLED = 'cancelled', 'Đã hủy'

    customer_name = models.CharField(max_length=255, verbose_name='Tên khách hàng')
    customer_phone = models.CharField(max_length=20, verbose_name='Số điện thoại')
    shipping_address = models.TextField(verbose_name='Địa chỉ giao hàng')

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name='Trạng thái',
    )

    payment_method = models.CharField(
        max_length=20,
        default='cod',
        verbose_name='Phương thức thanh toán',
    )

    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=0,
        verbose_name='Tổng tiền',
    )
    applied_discount_code = models.CharField(max_length=50, blank=True, default='')
    discount_amount = models.DecimalField(
        max_digits=12, decimal_places=0, default=0,
    )

    internal_note = models.TextField(
        blank=True,
        default='',
        verbose_name='Ghi chú nội bộ',
    )
    cancellation_reason = models.TextField(
        blank=True,
        default='',
        verbose_name='Lý do hủy',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Đơn hàng'
        verbose_name_plural = 'Đơn hàng'

    def __str__(self):
        return f'Đơn hàng #{self.id} - {self.customer_name}'



class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Đơn hàng',
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='order_items',
        verbose_name='Sản phẩm',
    )

    product_name = models.CharField(
        max_length=255,
        verbose_name='Tên sản phẩm tại thời điểm mua',
    )

    price = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        verbose_name='Đơn giá tại thời điểm mua',
    )
    cost_price = models.DecimalField(
        max_digits=12, decimal_places=0, default=0,
        verbose_name='Giá vốn tại thời điểm mua',
    )

    quantity = models.PositiveIntegerField(verbose_name='Số lượng')

    @property
    def subtotal(self):
        return self.price * self.quantity

    def __str__(self):
        return f'{self.product_name} x {self.quantity}'


class DiscountCode(models.Model):
    class DiscountType(models.TextChoices):
        PERCENTAGE = 'percentage', 'Phần trăm'
        FIXED = 'fixed', 'Số tiền'

    code = models.CharField(max_length=50, unique=True)
    discount_type = models.CharField(max_length=20, choices=DiscountType.choices)
    value = models.DecimalField(max_digits=12, decimal_places=0)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    max_uses = models.PositiveIntegerField(null=True, blank=True)
    used_count = models.PositiveIntegerField(default=0)
    min_order_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    products = models.ManyToManyField(Product, blank=True, related_name='discount_codes')
    categories = models.ManyToManyField(
        'products.Category', blank=True, related_name='discount_codes',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def clean(self):
        errors = {}
        if self.discount_type == self.DiscountType.PERCENTAGE:
            if self.value < 0 or self.value > 100:
                errors['value'] = 'Phần trăm giảm phải từ 0 đến 100.'
        elif self.discount_type == self.DiscountType.FIXED and self.value <= 0:
            errors['value'] = 'Số tiền giảm phải lớn hơn 0.'
        if self.starts_at and self.ends_at and self.starts_at >= self.ends_at:
            errors['ends_at'] = 'Thời gian kết thúc phải sau thời gian bắt đầu.'
        if self.max_uses is not None and self.max_uses < 0:
            errors['max_uses'] = 'Giới hạn sử dụng không được âm.'
        if self.used_count < 0:
            errors['used_count'] = 'Số lần đã sử dụng không được âm.'
        if errors:
            raise ValidationError(errors)

    def is_available(self, now=None):
        now = now or timezone.now()
        return (
            self.is_active and self.starts_at <= now <= self.ends_at
            and (self.max_uses is None or self.used_count < self.max_uses)
        )

    def __str__(self):
        return self.code


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='status_history',
        verbose_name='Đơn hàng',
    )
    from_status = models.CharField(max_length=20, blank=True, default='')
    to_status = models.CharField(max_length=20)
    reason = models.TextField(blank=True, default='')
    changed_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order_status_changes',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.order_id}: {self.from_status} -> {self.to_status}'