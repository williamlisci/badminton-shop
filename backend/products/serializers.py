from rest_framework import serializers
from PIL import Image, UnidentifiedImageError
from .models import Category, Brand, Product, ProductImage, StockTransaction


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description']


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name', 'slug', 'logo']


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'is_primary', 'order']

class AdminProductImageSerializer(serializers.ModelSerializer):
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        source='product',
        write_only=True,
    )

    class Meta:
        model = ProductImage
        fields = [
            'id',
            'product_id',
            'image',
            'is_primary',
            'order',
        ]

    def validate_image(self, image):
        max_size = 5 * 1024 * 1024
        if image.size > max_size:
            raise serializers.ValidationError(
                'Ảnh không được vượt quá 5 MB.',
            )

        try:
            image.seek(0)
            with Image.open(image) as opened_image:
                if opened_image.format not in {'JPEG', 'PNG', 'WEBP'}:
                    raise serializers.ValidationError(
                        'Chỉ chấp nhận ảnh JPEG, PNG hoặc WEBP.',
                    )
                opened_image.verify()
        except (UnidentifiedImageError, OSError):
            raise serializers.ValidationError('File tải lên không phải ảnh hợp lệ.')
        finally:
            image.seek(0)

        return image


class ProductListSerializer(serializers.ModelSerializer):
    """Dùng cho trang danh sách sản phẩm - dữ liệu gọn nhẹ"""
    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'price', 'compare_at_price', 'category', 'brand', 'primary_image', 'stock_quantity', 'low_stock_threshold']

    def get_primary_image(self, obj):
        image = obj.images.filter(is_primary=True).first() or obj.images.first()
        if image:
            request = self.context.get('request')
            url = image.image.url
            return request.build_absolute_uri(url) if request else url
        return None

class ProductDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'price',
            'compare_at_price',
            'stock_quantity',
            'low_stock_threshold',
            'is_active',
            'category',
            'brand',
            'images',
            'created_at',
            'updated_at',
        ]

class AdminProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True, allow_null=True)

    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source='category',
        write_only=True,
    )

    brand_id = serializers.PrimaryKeyRelatedField(
        queryset=Brand.objects.all(),
        source='brand',
        write_only=True,
        allow_null=True,
        required=False,
    )

    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'price',
            'compare_at_price',
            'stock_quantity',
            'is_active',
            'category',
            'brand',
            'category_id',
            'brand_id',
            'images',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'slug',
            'images',
            'created_at',
            'updated_at',
        ]

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError('Giá sản phẩm không được âm.')
        return value

    def validate_compare_at_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError('Giá gốc không được âm.')
        return value

    def validate_stock_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError('Tồn kho không được âm.')
        return value


class StockTransactionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    transaction_type_label = serializers.CharField(source='get_transaction_type_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)

    class Meta:
        model = StockTransaction
        fields = ['id', 'product', 'product_name', 'transaction_type', 'transaction_type_label', 'quantity', 'stock_before', 'stock_after', 'reason', 'created_by_name', 'created_at']
        read_only_fields = ['id', 'stock_before', 'stock_after', 'created_by_name', 'created_at']

    def validate(self, attrs):
        if attrs['transaction_type'] == StockTransaction.TransactionType.ADJUSTMENT and attrs['quantity'] == 0:
            raise serializers.ValidationError({'quantity': 'Số lượng điều chỉnh phải khác 0.'})
        if not attrs.get('reason', '').strip():
            raise serializers.ValidationError({'reason': 'Vui lòng nhập lý do.'})
        return attrs
