from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .throttles import LoginRateThrottle
from accounts.views import (
    AdminAuditLogViewSet, AdminStaffUserViewSet, CustomerGoogleLoginView, CustomerMeView, CustomerRegisterView,
    ShippingAddressViewSet, WishlistViewSet,
)
from rest_framework.routers import DefaultRouter


class AdminTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [LoginRateThrottle]


router = DefaultRouter()
router.register('admin-users', AdminStaffUserViewSet, basename='admin-user')
router.register('admin-audit-logs', AdminAuditLogViewSet, basename='admin-audit-log')
router.register('account/addresses', ShippingAddressViewSet, basename='account-address')
router.register('account/wishlist', WishlistViewSet, basename='account-wishlist')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('products.urls')),
    path(
        'api/auth/login/',
        AdminTokenObtainPairView.as_view(),
        name='token_obtain_pair',
    ),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/register/', CustomerRegisterView.as_view(), name='customer-register'),
    path('api/auth/google/', CustomerGoogleLoginView.as_view(), name='customer-google-login'),
    path('api/auth/customer-login/', TokenObtainPairView.as_view(), name='customer-login'),
    path('api/account/me/', CustomerMeView.as_view(), name='account-me'),
    path('api/orders/', include('orders.urls')),
    path('api/', include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
