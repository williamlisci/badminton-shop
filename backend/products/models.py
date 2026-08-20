from django.db import models
from django.utils.text import slugify


class Category(models.Model):
    """Danh mục sản phẩm: Vợt, Cầu, Túi vợt, Balo"""
    name = models.CharField(max_length=100, verbose_name="Tên danh mục")
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(blank=True, verbose_name="Mô tả")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Danh mục"
        verbose_name_plural = "Danh mục"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Brand(models.Model):
    """Thương hiệu: Yonex, Victor, Lining..."""
    name = models.CharField(max_length=100, verbose_name="Tên thương hiệu")
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    logo = models.ImageField(upload_to='brands/', blank=True, null=True)

    class Meta:
        verbose_name = "Thương hiệu"
        verbose_name_plural = "Thương hiệu"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Product(models.Model):
    """Sản phẩm chính: vợt, cầu, túi, balo"""
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products', verbose_name="Danh mục")
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name='products', verbose_name="Thương hiệu")
    name = models.CharField(max_length=255, verbose_name="Tên sản phẩm")
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    description = models.TextField(blank=True, verbose_name="Mô tả chi tiết")
    price = models.DecimalField(max_digits=12, decimal_places=0, verbose_name="Giá bán (VNĐ)")
    compare_at_price = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True, verbose_name="Giá gốc (trước giảm)")
    stock_quantity = models.PositiveIntegerField(default=0, verbose_name="Số lượng tồn kho")
    low_stock_threshold = models.PositiveIntegerField(default=5, verbose_name="Ngưỡng tồn kho thấp")
    is_active = models.BooleanField(default=True, verbose_name="Đang bán")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Sản phẩm"
        verbose_name_plural = "Sản phẩm"
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class StockTransaction(models.Model):
    class TransactionType(models.TextChoices):
        IN = 'in', 'Nhập kho'
        OUT = 'out', 'Xuất kho'
        ADJUSTMENT = 'adjustment', 'Điều chỉnh'

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_transactions')
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    quantity = models.IntegerField()
    stock_before = models.PositiveIntegerField()
    stock_after = models.PositiveIntegerField()
    reason = models.CharField(max_length=255)
    created_by = models.ForeignKey('auth.User', null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class ProductImage(models.Model):
    """Nhiều ảnh cho 1 sản phẩm"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/')
    is_primary = models.BooleanField(default=False, verbose_name="Ảnh chính")
    order = models.PositiveIntegerField(default=0, verbose_name="Thứ tự hiển thị")

    class Meta:
        verbose_name = "Ảnh sản phẩm"
        verbose_name_plural = "Ảnh sản phẩm"
        ordering = ['order']

    def __str__(self):
        return f"Ảnh của {self.product.name}"
