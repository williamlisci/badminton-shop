from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminOrderViewSet,
    AdminCustomerViewSet,
    DashboardStatsView,
    ReportsView,
    OrderCreateView,
    DiscountValidationView,
    OrderTrackingView,
    CustomerOrderHistoryView,
    AdminDiscountCodeViewSet,
)

router = DefaultRouter()
router.register(
    'admin-orders',
    AdminOrderViewSet,
    basename='admin-order',
)
router.register('admin-customers', AdminCustomerViewSet, basename='admin-customer')
router.register('admin-discounts', AdminDiscountCodeViewSet, basename='admin-discount')

urlpatterns = [
    path('', OrderCreateView.as_view(), name='order-create'),
    path('validate-discount/', DiscountValidationView.as_view(), name='discount-validate'),
    path('track/', OrderTrackingView.as_view(), name='order-track'),
    path('mine/', CustomerOrderHistoryView.as_view(), name='customer-order-history'),
    path(
        'dashboard-stats/',
        DashboardStatsView.as_view(),
        name='dashboard-stats',
    ),
    path('reports/', ReportsView.as_view(), name='reports'),
    path('', include(router.urls)),
]