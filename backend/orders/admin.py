from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = [
        'product',
        'product_name',
        'price',
        'quantity',
        'subtotal',
    ]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'customer_name',
        'customer_phone',
        'status',
        'payment_method',
        'total_amount',
        'created_at',
    ]

    list_filter = [
        'status',
        'payment_method',
        'created_at',
    ]

    search_fields = [
        'customer_name',
        'customer_phone',
        'shipping_address',
    ]

    readonly_fields = [
        'created_at',
        'updated_at',
    ]

    inlines = [OrderItemInline]