from django_filters.rest_framework import DjangoFilterBackend
from decimal import Decimal, InvalidOperation
from django.db.models import Count, F, Q, Sum, IntegerField, Value
from django.db.models.functions import Coalesce
from django.db import transaction
import csv
from io import StringIO

from django.http import HttpResponse
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from accounts.permissions import ProductManagerPermission
from accounts.audit import record_audit
from accounts.models import AuditLog
from rest_framework.response import Response

from .models import Brand, Category, Product
from .serializers import (
    AdminProductSerializer,
    AdminBrandSerializer,
    AdminCategorySerializer,
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
from .pagination import AdminProductPagination
from .pagination import PublicProductPagination


def _csv_response(filename, headers, rows):
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    response = HttpResponse(output.getvalue(), content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    lookup_field = 'slug'


class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Brand.objects.filter(is_active=True)
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
    ordering_fields = ['price', 'created_at', 'sold_quantity', 'popularity']

    pagination_class = PublicProductPagination

    def list(self, request, *args, **kwargs):
        # Preserve the original array response for clients that do not request pagination.
        if 'page' not in request.query_params:
            self.pagination_class = None
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.annotate(
            sold_quantity=Coalesce(
                Sum(
                    'order_items__quantity',
                    filter=~Q(order_items__order__status='cancelled'),
                ),
                Value(0),
                output_field=IntegerField(),
            ),
        )
        queryset = queryset.annotate(popularity=F('sold_quantity'))
        if self.request.query_params.get('promotion') == 'true':
            queryset = queryset.filter(compare_at_price__gt=F('price'))
        for parameter in ('price__gte', 'price__lte'):
            value = self.request.query_params.get(parameter)
            if value:
                try:
                    numeric_value = Decimal(value)
                except InvalidOperation:
                    from rest_framework.exceptions import ValidationError
                    raise ValidationError({parameter: 'Giá phải là một số hợp lệ.'})
                queryset = queryset.filter(**{parameter: numeric_value})
        return queryset

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
    permission_classes = [ProductManagerPermission]
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

    def perform_create(self, serializer):
        product = serializer.save()
        record_audit(
            self.request.user, AuditLog.Action.CREATED, 'product', product.id,
            f'Tạo sản phẩm "{product.name}".',
            {'name': {'before': None, 'after': product.name}},
        )

    def perform_update(self, serializer):
        product = serializer.instance
        tracked = (
            'name', 'description', 'price', 'compare_at_price',
            'stock_quantity', 'low_stock_threshold', 'is_active',
            'category_id', 'brand_id',
        )
        before = {field: getattr(product, field) for field in tracked}
        updated = serializer.save()
        changes = {
            field: {'before': before[field], 'after': getattr(updated, field)}
            for field in tracked if before[field] != getattr(updated, field)
        }
        if changes:
            record_audit(
                self.request.user, AuditLog.Action.UPDATED, 'product', updated.id,
                f'Cập nhật sản phẩm "{updated.name}".', changes,
            )

    def perform_destroy(self, instance):
        record_audit(
            self.request.user, AuditLog.Action.DELETED, 'product', instance.id,
            f'Xóa sản phẩm "{instance.name}".',
        )
        super().perform_destroy(instance)

    @action(detail=False, methods=['get'], url_path='export', url_name='export')
    def export_products(self, request):
        products = self.get_queryset().order_by('id')
        return _csv_response(
            'products.csv',
            ['id', 'name', 'slug', 'description', 'price', 'cost_price', 'compare_at_price',
             'stock_quantity', 'low_stock_threshold', 'is_active',
             'category_id', 'category_name', 'brand_id', 'brand_name',
             'created_at', 'updated_at'],
            (
                [p.id, p.name, p.slug, p.description, p.price, p.cost_price, p.compare_at_price,
                 p.stock_quantity, p.low_stock_threshold, p.is_active,
                 p.category_id, p.category.name, p.brand_id, p.brand.name if p.brand else '',
                 p.created_at.isoformat(), p.updated_at.isoformat()]
                for p in products
            ),
        )

    @action(detail=False, methods=['post'], url_path='import', url_name='import')
    def import_products(self, request):
        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({'detail': 'Vui lòng tải lên file bằng trường file.'},
                            status=status.HTTP_400_BAD_REQUEST)
        name = uploaded.name.lower()
        try:
            if name.endswith('.csv'):
                text = uploaded.read().decode('utf-8-sig')
                rows = list(csv.DictReader(StringIO(text)))
            elif name.endswith('.xlsx'):
                from openpyxl import load_workbook
                workbook = load_workbook(uploaded, read_only=True, data_only=True)
                sheet = workbook.active
                values = list(sheet.values)
                rows = [dict(zip(values[0], row)) for row in values[1:] if any(v is not None for v in row)]
            else:
                raise ValueError('Chỉ hỗ trợ file CSV hoặc XLSX.')
        except Exception as exc:
            return Response({'detail': f'Không thể đọc file: {exc}'},
                            status=status.HTTP_400_BAD_REQUEST)

        successes, errors = 0, []
        for line_number, raw in enumerate(rows, start=2):
            data = {str(k).strip(): v for k, v in raw.items() if k is not None}
            # Accept category/brand names in addition to the API's *_id fields.
            for field, model in (('category', Category), ('brand', Brand)):
                if not data.get(f'{field}_id') and data.get(f'{field}_name'):
                    obj = model.objects.filter(name=str(data[f'{field}_name']).strip()).first()
                    if obj:
                        data[f'{field}_id'] = obj.pk
            if 'brand_id' in data and data['brand_id'] in ('', None):
                data['brand_id'] = None
            data.pop('id', None)
            data.pop('slug', None)
            data.pop('category_name', None)
            data.pop('brand_name', None)
            serializer = self.get_serializer(data=data)
            if serializer.is_valid():
                product = serializer.save()
                record_audit(
                    request.user, AuditLog.Action.CREATED, 'product', product.id,
                    f'Nhập sản phẩm "{product.name}" từ file.',
                    {'source': {'before': None, 'after': 'import'}},
                )
                successes += 1
            else:
                errors.append({'line': line_number, 'errors': serializer.errors})
        return Response({'success_count': successes, 'error_count': len(errors), 'errors': errors})

class AdminProductImageViewSet(viewsets.ModelViewSet):
    queryset = ProductImage.objects.all().select_related('product')
    serializer_class = AdminProductImageSerializer
    permission_classes = [ProductManagerPermission]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def perform_create(self, serializer):
        product = serializer.validated_data['product']
        is_primary = serializer.validated_data.get('is_primary', False)
        if not product.images.exists():
            is_primary = True
        if is_primary:
            ProductImage.objects.filter(product=product).update(is_primary=False)
        last_order = product.images.order_by('-order').values_list('order', flat=True).first()
        serializer.save(order=(last_order + 1 if last_order is not None else 0), is_primary=is_primary)

    def perform_update(self, serializer):
        image = serializer.instance
        is_primary = serializer.validated_data.get('is_primary', image.is_primary)
        if is_primary:
            ProductImage.objects.filter(product=image.product).exclude(pk=image.pk).update(is_primary=False)
        serializer.save(is_primary=is_primary)

    def perform_destroy(self, instance):
        was_primary = instance.is_primary
        product = instance.product
        image_file = instance.image
        super().perform_destroy(instance)
        if image_file:
            image_file.delete(save=False)
        if was_primary:
            replacement = product.images.order_by('order', 'id').first()
            if replacement:
                replacement.is_primary = True
                replacement.save(update_fields=['is_primary'])

    @action(detail=True, methods=['post'], url_path='set-primary')
    def set_primary(self, request, pk=None):
        image = self.get_object()
        ProductImage.objects.filter(product=image.product).update(is_primary=False)
        image.is_primary = True
        image.save(update_fields=['is_primary'])
        return Response(self.get_serializer(image).data)

    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder(self, request):
        product_id = request.data.get('product_id')
        image_ids = request.data.get('image_ids')
        if not isinstance(image_ids, list) or not product_id:
            return Response(
                {'detail': 'Cần product_id và danh sách image_ids.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            image_ids = [int(image_id) for image_id in image_ids]
            product_id = int(product_id)
        except (TypeError, ValueError):
            return Response(
                {'detail': 'product_id và image_ids phải là số.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        images = list(ProductImage.objects.filter(product_id=product_id))
        if {image.id for image in images} != set(image_ids):
            return Response(
                {'detail': 'Danh sách ảnh không thuộc cùng sản phẩm hoặc bị thiếu ảnh.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        for order, image_id in enumerate(image_ids):
            ProductImage.objects.filter(pk=image_id).update(order=order)
        return Response(self.get_serializer(ProductImage.objects.filter(product_id=product_id), many=True).data)


class AdminStockTransactionViewSet(viewsets.ModelViewSet):
    queryset = StockTransaction.objects.select_related('product', 'created_by').all()
    serializer_class = StockTransactionSerializer
    permission_classes = [ProductManagerPermission]
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
        stock_transaction = serializer.save(
            stock_before=product.stock_quantity,
            stock_after=new_stock,
            created_by=self.request.user,
        )
        product.stock_quantity = new_stock
        product.save(update_fields=['stock_quantity', 'updated_at'])
        record_audit(
            self.request.user, AuditLog.Action.STOCK_CHANGED, 'product', product.id,
            f'Thay đổi tồn kho "{product.name}": {stock_transaction.stock_before} → {stock_transaction.stock_after}.',
            {
                'stock_quantity': {
                    'before': stock_transaction.stock_before,
                    'after': stock_transaction.stock_after,
                },
                'quantity': {'before': None, 'after': stock_transaction.quantity},
                'reason': {'before': None, 'after': stock_transaction.reason},
            },
        )


class AdminCategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.annotate(product_count=Count('products', filter=Q(products__is_active=True))).order_by('name')
    serializer_class = AdminCategorySerializer
    permission_classes = [ProductManagerPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']

    def destroy(self, request, *args, **kwargs):
        category = self.get_object()
        category.is_active = False
        category.save(update_fields=['is_active'])
        return Response(status=204)


class AdminBrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all().order_by('name')
    serializer_class = AdminBrandSerializer
    permission_classes = [ProductManagerPermission]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_active']
    search_fields = ['name']

    def destroy(self, request, *args, **kwargs):
        brand = self.get_object()
        brand.is_active = False
        brand.save(update_fields=['is_active'])
        return Response(status=204)
