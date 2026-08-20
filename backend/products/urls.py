from rest_framework.routers import DefaultRouter

from .views import (
    AdminProductViewSet,
    BrandViewSet,
    CategoryViewSet,
    ProductViewSet,
    AdminProductImageViewSet,
    AdminStockTransactionViewSet,
)

router = DefaultRouter()

router.register(
    'categories',
    CategoryViewSet,
    basename='category',
)

router.register(
    'brands',
    BrandViewSet,
    basename='brand',
)

router.register(
    'products',
    ProductViewSet,
    basename='product',
)

router.register(
    'admin-products',
    AdminProductViewSet,
    basename='admin-product',
)

router.register(
    'admin-product-images',
    AdminProductImageViewSet,
    basename='admin-product-image',
)
router.register('admin-stock-transactions', AdminStockTransactionViewSet, basename='admin-stock-transaction')

urlpatterns = router.urls
