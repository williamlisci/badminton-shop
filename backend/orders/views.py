from calendar import monthrange
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.db.models import Count, DecimalField, F, Sum
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Product
from .models import Order
from .serializers import (
    AdminOrderSerializer,
    OrderCreateSerializer,
    OrderSerializer,
)


def month_offset(year, month, offset):
    month_index = year * 12 + month - 1 + offset
    return divmod(month_index, 12)[0], divmod(month_index, 12)[1] + 1


def aware_start(value):
    return timezone.make_aware(
        datetime.combine(value, time.min),
        timezone.get_current_timezone(),
    )


class OrderCreateView(generics.CreateAPIView):
    serializer_class = OrderCreateSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = serializer.save()
        response_serializer = OrderSerializer(
            order,
            context={'request': request},
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )


class DashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        period = request.query_params.get('period', 'day')
        if period not in {'day', 'month'}:
            return Response(
                {'detail': 'period phải là day hoặc month.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if period == 'month':
            bucket_count = 12
            now = timezone.localdate()
            current_year, current_month = month_offset(
                now.year,
                now.month,
                0,
            )
            start_date = date(current_year, current_month, 1)
            previous_year, previous_month = month_offset(
                current_year,
                current_month,
                -bucket_count,
            )
            previous_start_date = date(previous_year, previous_month, 1)
            current_start = aware_start(start_date)
            previous_start = aware_start(previous_start_date)
            bucket_trunc = TruncMonth('created_at')
        else:
            bucket_count = 30
            end_date = timezone.localdate()
            start_date = end_date - timedelta(days=bucket_count - 1)
            previous_start_date = start_date - timedelta(days=bucket_count)
            current_start = aware_start(start_date)
            previous_start = aware_start(previous_start_date)
            bucket_trunc = TruncDate('created_at')

        sales_orders = Order.objects.exclude(status=Order.Status.CANCELLED)
        period_all_orders = Order.objects.filter(created_at__gte=current_start)
        period_orders = sales_orders.filter(created_at__gte=current_start)
        previous_orders = sales_orders.filter(
            created_at__gte=previous_start,
            created_at__lt=current_start,
        )

        period_revenue = period_orders.aggregate(
            total=Sum('total_amount'),
        )['total'] or Decimal('0')
        previous_revenue = previous_orders.aggregate(
            total=Sum('total_amount'),
        )['total'] or Decimal('0')
        period_order_count = period_orders.count()

        if previous_revenue:
            comparison_percent = round(
                (period_revenue - previous_revenue)
                * Decimal('100')
                / previous_revenue,
                2,
            )
        elif period_revenue:
            comparison_percent = Decimal('100')
        else:
            comparison_percent = Decimal('0')

        trend_rows = period_orders.annotate(
            bucket=bucket_trunc,
        ).values('bucket').annotate(
            revenue=Sum('total_amount'),
            orders=Count('id'),
        ).order_by('bucket')
        trend_map = {
            row['bucket'].strftime('%Y-%m' if period == 'month' else '%Y-%m-%d'): row
            for row in trend_rows
        }

        revenue_trend = []
        if period == 'month':
            for offset in range(bucket_count):
                year, month = month_offset(
                    start_date.year,
                    start_date.month,
                    offset,
                )
                label = f'{year:04d}-{month:02d}'
                row = trend_map.get(label, {})
                revenue_trend.append({
                    'label': label,
                    'revenue': row.get('revenue', Decimal('0')),
                    'orders': row.get('orders', 0),
                })
        else:
            for offset in range(bucket_count):
                current_date = start_date + timedelta(days=offset)
                label = current_date.isoformat()
                row = trend_map.get(label, {})
                revenue_trend.append({
                    'label': label,
                    'revenue': row.get('revenue', Decimal('0')),
                    'orders': row.get('orders', 0),
                })

        status_labels = dict(Order.Status.choices)
        status_rows = period_all_orders.values('status').annotate(
            count=Count('id'),
        )
        status_map = {row['status']: row['count'] for row in status_rows}
        orders_by_status = [
            {
                'status': value,
                'label': status_labels[value],
                'count': status_map.get(value, 0),
            }
            for value, _label in Order.Status.choices
        ]

        top_products = []
        item_rows = period_orders.filter(
            items__isnull=False,
        ).values(
            product_id=F('items__product_id'),
            product_name=F('items__product_name'),
        ).annotate(
            quantity_sold=Sum('items__quantity'),
            revenue=Sum(
                F('items__price') * F('items__quantity'),
                output_field=DecimalField(max_digits=12, decimal_places=0),
            ),
        ).order_by('-quantity_sold', '-revenue')[:5]
        for row in item_rows:
            top_products.append(row)

        low_stock_threshold = 5
        low_stock_products = list(
            Product.objects.filter(
                is_active=True,
                stock_quantity__lte=low_stock_threshold,
            ).select_related('category').order_by(
                'stock_quantity',
                'name',
            ).values(
                'id',
                'name',
                'stock_quantity',
                category_name=F('category__name'),
            )[:10]
        )

        total_orders = sales_orders.count()
        total_revenue = sales_orders.aggregate(
            total=Sum('total_amount'),
        )['total'] or Decimal('0')

        return Response({
            # Giữ các trường cũ để client cũ vẫn tương thích.
            'total_products': Product.objects.filter(is_active=True).count(),
            'total_orders': total_orders,
            'total_revenue': total_revenue,
            'period': period,
            'period_orders': period_order_count,
            'period_revenue': period_revenue,
            'average_order_value': (
                period_revenue / period_order_count
                if period_order_count else Decimal('0')
            ),
            'revenue_trend': revenue_trend,
            'orders_by_status': orders_by_status,
            'top_products': top_products,
            'low_stock_products': low_stock_products,
            'comparison': {
                'previous_revenue': previous_revenue,
                'change_percent': comparison_percent,
            },
        })


class AdminOrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().prefetch_related('items')
    serializer_class = AdminOrderSerializer
    permission_classes = [IsAdminUser]
    http_method_names = ['get', 'patch', 'head', 'options']
