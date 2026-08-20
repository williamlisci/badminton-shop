from django.db import transaction
from rest_framework import serializers

from products.models import Product
from .models import Order, OrderItem


class OrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            'id',
            'product',
            'product_name',
            'price',
            'quantity',
            'subtotal',
        ]
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'customer_name',
            'customer_phone',
            'shipping_address',
            'status',
            'payment_method',
            'total_amount',
            'items',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'status',
            'payment_method',
            'total_amount',
            'items',
            'created_at',
        ]


class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemInputSerializer(many=True, write_only=True)
    customer_phone = serializers.RegexField(
        regex=r'^[0-9+()\-\s]{7,20}$',
        error_messages={
            'invalid': 'Số điện thoại không hợp lệ.',
        },
    )

    class Meta:
        model = Order
        fields = [
            'customer_name',
            'customer_phone',
            'shipping_address',
            'items',
        ]

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError(
                'Đơn hàng phải có ít nhất một sản phẩm.'
            )

        product_ids = [item['product_id'] for item in items]

        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError(
                'Một sản phẩm không được xuất hiện nhiều lần.'
            )

        products = Product.objects.filter(
            id__in=product_ids,
            is_active=True,
        )

        if products.count() != len(product_ids):
            raise serializers.ValidationError(
                'Một hoặc nhiều sản phẩm không tồn tại.'
            )

        product_map = {product.id: product for product in products}

        for item in items:
            product = product_map[item['product_id']]

            if item['quantity'] > product.stock_quantity:
                raise serializers.ValidationError(
                    f'Sản phẩm "{product.name}" chỉ còn '
                    f'{product.stock_quantity} sản phẩm.'
                )

        return items

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')

        order = Order.objects.create(
            **validated_data,
            payment_method='cod',
        )

        total_amount = 0

        for item_data in items_data:
            product = Product.objects.select_for_update().get(
                id=item_data['product_id'],
                is_active=True,
            )

            quantity = item_data['quantity']

            if quantity > product.stock_quantity:
                raise serializers.ValidationError(
                    f'Sản phẩm "{product.name}" vừa hết hàng.'
                )

            price = product.price
            subtotal = price * quantity

            OrderItem.objects.create(
                order=order,
                product=product,
                product_name=product.name,
                price=price,
                quantity=quantity,
            )

            product.stock_quantity -= quantity
            product.save(update_fields=['stock_quantity'])

            total_amount += subtotal

        order.total_amount = total_amount
        order.save(update_fields=['total_amount'])

        return order
class AdminProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'id',
            'category',
            'brand',
            'name',
            'description',
            'price',
            'compare_at_price',
            'stock_quantity',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
        ]
class AdminOrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'customer_name',
            'customer_phone',
            'shipping_address',
            'status',
            'payment_method',
            'total_amount',
            'items',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'customer_name',
            'customer_phone',
            'shipping_address',
            'payment_method',
            'total_amount',
            'items',
            'created_at',
            'updated_at',
        ]
