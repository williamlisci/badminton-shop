from django.db import models
from products.models import Product


class Order(models.Model):
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

    quantity = models.PositiveIntegerField(verbose_name='Số lượng')

    @property
    def subtotal(self):
        return self.price * self.quantity

    def __str__(self):
        return f'{self.product_name} x {self.quantity}'