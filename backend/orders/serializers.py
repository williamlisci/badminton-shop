from decimal import Decimal
from django.db import transaction
from rest_framework import serializers

from products.models import Product
from accounts.audit import record_audit
from accounts.models import AuditLog
from .models import Customer, DiscountCode, Order, OrderItem, OrderStatusHistory


class OrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)


class DiscountValidationSerializer(serializers.Serializer):
    discount_code = serializers.CharField(max_length=50, allow_blank=True)
    items = OrderItemInputSerializer(many=True)

    def validate(self, attrs):
        code = attrs['discount_code'].strip().upper()
        if not code:
            raise serializers.ValidationError({'discount_code': 'Vui lòng nhập mã giảm giá.'})
        items = attrs['items']
        product_ids = [item['product_id'] for item in items]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError({'items': 'Một sản phẩm không được xuất hiện nhiều lần.'})
        products = Product.objects.filter(id__in=product_ids, is_active=True).select_related('category')
        if products.count() != len(product_ids):
            raise serializers.ValidationError({'items': 'Một hoặc nhiều sản phẩm không tồn tại.'})
        product_map = {product.id: product for product in products}
        total_amount = sum(
            (product_map[item['product_id']].price * item['quantity'] for item in items),
            Decimal('0'),
        )
        discount = DiscountCode.objects.filter(code=code).prefetch_related(
            'products', 'categories',
        ).first()
        if not discount or not discount.is_available():
            raise serializers.ValidationError(
                {'discount_code': 'Mã giảm giá không hợp lệ hoặc đã hết hạn.'},
            )
        if total_amount < discount.min_order_amount:
            raise serializers.ValidationError(
                {'discount_code': 'Đơn hàng chưa đạt giá trị tối thiểu.'},
            )
        eligible_products = set(discount.products.values_list('id', flat=True))
        eligible_categories = set(discount.categories.values_list('id', flat=True))
        eligible_amount = sum(
            (
                product_map[item['product_id']].price * item['quantity']
                for item in items
                if not eligible_products and not eligible_categories
                or product_map[item['product_id']].id in eligible_products
                or product_map[item['product_id']].category_id in eligible_categories
            ),
            Decimal('0'),
        )
        if discount.discount_type == DiscountCode.DiscountType.PERCENTAGE:
            discount_amount = (eligible_amount * discount.value / 100).quantize(Decimal('1'))
        else:
            discount_amount = min(discount.value, eligible_amount)
        attrs.update({
            'discount_code': code,
            'total_amount': total_amount,
            'discount_amount': discount_amount,
            'discounted_total': max(Decimal('0'), total_amount - discount_amount),
        })
        return attrs


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
            'user',
            'customer_name',
            'customer_phone',
            'shipping_address',
            'status',
            'payment_method',
            'total_amount',
            'applied_discount_code',
            'discount_amount',
            'items',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'user',
            'status',
            'payment_method',
            'total_amount',
            'applied_discount_code',
            'discount_amount',
            'items',
            'created_at',
        ]


class OrderCreateSerializer(serializers.ModelSerializer):
    payment_method = serializers.ChoiceField(
        choices=[('cod', 'Thanh toán khi nhận hàng'), ('bank_transfer', 'Chuyển khoản online')],
        default='cod',
    )
    items = OrderItemInputSerializer(many=True, write_only=True)
    discount_code = serializers.CharField(
        write_only=True, required=False, allow_blank=True, max_length=50,
    )
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
            'payment_method',
            'items',
            'discount_code',
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
        discount_code = validated_data.pop('discount_code', '').strip().upper()

        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        order = Order.objects.create(**validated_data)

        total_amount = 0
        eligible_amount = 0
        discount = None
        eligible_products = eligible_categories = None
        if discount_code:
            discount = DiscountCode.objects.select_for_update().filter(
                code=discount_code,
            ).first()
            if not discount or not discount.is_available():
                raise serializers.ValidationError(
                    {'discount_code': 'Mã giảm giá không hợp lệ hoặc đã hết hạn.'}
                )
            if discount.products.exists() or discount.categories.exists():
                eligible_products = set(discount.products.values_list('id', flat=True))
                eligible_categories = set(discount.categories.values_list('id', flat=True))
            else:
                eligible_products = eligible_categories = None

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
            total_amount += subtotal
            if eligible_products is None or product.id in eligible_products or product.category_id in eligible_categories:
                eligible_amount += subtotal

            OrderItem.objects.create(
                order=order,
                product=product,
                product_name=product.name,
                price=price,
                cost_price=product.cost_price,
                quantity=quantity,
            )

            product.stock_quantity -= quantity
            product.save(update_fields=['stock_quantity'])
            record_audit(
                self.context.get('request', {}).user
                if self.context.get('request') else None,
                AuditLog.Action.STOCK_CHANGED,
                'product',
                product.id,
                f'Xuất kho "{product.name}" để tạo đơn hàng.',
                {
                    'stock_quantity': {
                        'before': product.stock_quantity + quantity,
                        'after': product.stock_quantity,
                    },
                    'quantity': {'before': None, 'after': -quantity},
                    'order_id': {'before': None, 'after': order.id},
                },
            )

        if discount:
            if total_amount < discount.min_order_amount:
                raise serializers.ValidationError(
                    {'discount_code': 'Đơn hàng chưa đạt giá trị tối thiểu.'}
                )
            if discount.discount_type == DiscountCode.DiscountType.PERCENTAGE:
                discount_amount = (eligible_amount * discount.value / 100).quantize(Decimal('1'))
            else:
                discount_amount = min(discount.value, eligible_amount)
            discount.used_count += 1
            discount.save(update_fields=['used_count', 'updated_at'])
        else:
            discount_amount = Decimal('0')
        order.applied_discount_code = discount_code
        order.discount_amount = discount_amount
        order.total_amount = max(Decimal('0'), total_amount - discount_amount)
        order.save(update_fields=['total_amount', 'applied_discount_code', 'discount_amount'])

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

    class StatusHistorySerializer(serializers.ModelSerializer):
        changed_by = serializers.CharField(
            source='changed_by.username',
            read_only=True,
            allow_null=True,
        )

        class Meta:
            model = OrderStatusHistory
            fields = [
                'id',
                'from_status',
                'to_status',
                'reason',
                'changed_by',
                'created_at',
            ]

    status_history = StatusHistorySerializer(many=True, read_only=True)
    reason = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
    )

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
            'internal_note',
            'cancellation_reason',
            'status_history',
            'reason',
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
            'status_history',
        ]

    def validate(self, attrs):
        status_value = attrs.get('status')
        reason = attrs.get('reason', '').strip()
        if status_value == Order.Status.CANCELLED and not reason and not self.instance.cancellation_reason:
            raise serializers.ValidationError(
                {'reason': 'Vui lòng cung cấp lý do hủy đơn.'}
            )
        return attrs

    def update(self, instance, validated_data):
        validated_data.pop('reason', None)
        return super().update(instance, validated_data)


class AdminCustomerOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            'id', 'customer_name', 'customer_phone', 'shipping_address',
            'status', 'payment_method', 'total_amount', 'created_at',
        ]
        read_only_fields = fields


class AdminCustomerSerializer(serializers.ModelSerializer):
    purchase_count = serializers.IntegerField(read_only=True)
    total_spent = serializers.DecimalField(
        max_digits=12, decimal_places=0, read_only=True,
    )
    orders = serializers.SerializerMethodField()

    def get_orders(self, obj):
        return AdminCustomerOrderSerializer(
            Order.objects.filter(
                customer_phone=obj.customer_phone,
            ).order_by('-created_at'),
            many=True,
        ).data

    class Meta:
        model = Customer
        fields = [
            'id', 'customer_name', 'customer_phone', 'note',
            'purchase_count', 'total_spent', 'orders',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'customer_name', 'customer_phone', 'purchase_count',
            'total_spent', 'orders', 'created_at', 'updated_at',
        ]
