from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAdminUser

from .models import Brand, Category, Product
from .serializers import (
    AdminProductSerializer,
    BrandSerializer,
    CategorySerializer,
    ProductDetailSerializer,
    ProductListSerializer,
)
from .models import Brand, Category, Product, ProductImage, StockTransaction
from .serializers import (
    AdminProductImageSerializer,
    AdminProductSerializer,
    BrandSerializer,
    CategorySerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    StockTransactionSerializer,
)
from rest_framework.parsers import FormParser, MultiPartParser

from .pagination import AdminProductPagination


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = 'slug'


class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    lookup_field = 'slug'


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.filter(
        is_active=True,
    ).select_related(
        'category',
        'brand',
    ).prefetch_related('images')

    lookup_field = 'slug'
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['category__slug', 'brand__slug']
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer

        return ProductListSerializer


class AdminProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().select_related(
        'category',
        'brand',
    ).prefetch_related('images')

    serializer_class = AdminProductSerializer
    permission_classes = [IsAdminUser]
    pagination_class = AdminProductPagination
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = [
        'category__slug',
        'brand__slug',
        'is_active',
    ]
    search_fields = [
        'name',
        'description',
        'brand__name',
        'category__name',
    ]
    ordering_fields = [
        'name',
        'price',
        'stock_quantity',
        'created_at',
    ]

class AdminProductImageViewSet(viewsets.ModelViewSet):
    queryset = ProductImage.objects.all().select_related('product')
    serializer_class = AdminProductImageSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]


class AdminStockTransactionViewSet(viewsets.ModelViewSet):
    queryset = StockTransaction.objects.select_related('product', 'created_by').all()
    serializer_class = StockTransactionSerializer
    permission_classes = [IsAdminUser]
    http_method_names = ['get', 'post', 'head', 'options']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['product', 'transaction_type']
    search_fields = ['product__name', 'reason']

    @transaction.atomic
    def perform_create(self, serializer):
        product = Product.objects.select_for_update().get(id=serializer.validated_data['product'].id)
        kind = serializer.validated_data['transaction_type']
        quantity = serializer.validated_data['quantity']
        delta = abs(quantity) if kind == StockTransaction.TransactionType.IN else -abs(quantity) if kind == StockTransaction.TransactionType.OUT else quantity
        new_stock = product.stock_quantity + delta
        if new_stock < 0:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'quantity': 'Tồn kho không được âm.'})
        serializer.save(stock_before=product.stock_quantity, stock_after=new_stock, created_by=self.request.user)
        product.stock_quantity = new_stock
        product.save(update_fields=['stock_quantity', 'updated_at'])
