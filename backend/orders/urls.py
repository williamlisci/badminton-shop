from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminOrderViewSet,
    DashboardStatsView,
    OrderCreateView,
)

router = DefaultRouter()
router.register(
    'admin-orders',
    AdminOrderViewSet,
    basename='admin-order',
)

urlpatterns = [
    path('', OrderCreateView.as_view(), name='order-create'),
    path(
        'dashboard-stats/',
        DashboardStatsView.as_view(),
        name='dashboard-stats',
    ),
    path('', include(router.urls)),
]