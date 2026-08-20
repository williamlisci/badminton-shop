from decimal import Decimal
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Brand, Category, Product, ProductImage


User = get_user_model()



def one_pixel_png():
    buffer = BytesIO()
    Image.new('RGB', (1, 1), color='white').save(buffer, format='PNG')
    return buffer.getvalue()


class AdminProductApiTests(APITestCase):
    def setUp(self):
        self.category = Category.objects.create(name='Vợt cầu lông')
        self.brand = Brand.objects.create(name='Victor')
        self.product = Product.objects.create(
            category=self.category,
            brand=self.brand,
            name='Victor Thruster',
            price=Decimal('2500000'),
            stock_quantity=10,
            is_active=True,
        )

        self.regular_user = User.objects.create_user(
            username='customer',
            password='test-password',
        )
        self.admin_user = User.objects.create_user(
            username='admin',
            password='test-password',
            is_staff=True,
        )

        self.list_url = reverse('admin-product-list')

    def product_payload(self, **overrides):
        payload = {
            'name': 'Yonex Astrox',
            'description': 'Vợt cầu lông chính hãng',
            'price': '3200000',
            'compare_at_price': '3500000',
            'stock_quantity': 8,
            'is_active': True,
            'category_id': self.category.id,
            'brand_id': self.brand.id,
        }
        payload.update(overrides)
        return payload

    def test_anonymous_user_cannot_access_admin_products(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_regular_user_cannot_access_admin_products(self):
        self.client.force_authenticate(user=self.regular_user)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_list_products(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Victor Thruster')
        self.assertEqual(response.data['results'][0]['category']['name'], 'Vợt cầu lông')
        self.assertEqual(response.data['results'][0]['brand']['name'], 'Victor')

    def test_admin_product_list_supports_search_and_pagination(self):
        Product.objects.create(
            category=self.category,
            brand=self.brand,
            name='Yonex Astrox',
            price=Decimal('3200000'),
            stock_quantity=8,
            is_active=True,
        )
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(
            self.list_url,
            {'search': 'Yonex', 'page_size': 1},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Yonex Astrox')

    def test_admin_can_create_product(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            self.list_url,
            self.product_payload(),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Product.objects.filter(name='Yonex Astrox').exists(),
        )

    def test_admin_cannot_create_product_with_negative_price(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            self.list_url,
            self.product_payload(price='-1'),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('không được âm', str(response.data))

    def test_admin_can_update_product(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse(
            'admin-product-detail',
            kwargs={'pk': self.product.id},
        )

        response = self.client.patch(
            url,
            {'price': '2300000', 'is_active': False},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal('2300000'))
        self.assertFalse(self.product.is_active)

    def test_regular_user_cannot_upload_product_image(self):
        self.client.force_authenticate(user=self.regular_user)
        image = SimpleUploadedFile(
            'product.jpg',
            one_pixel_png(),
            content_type='image/png',
        )

        response = self.client.post(
            reverse('admin-product-image-list'),
            {
                'product_id': self.product.id,
                'image': image,
                'is_primary': 'true',
                'order': '0',
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(ProductImage.objects.count(), 0)

    def test_admin_can_upload_product_image(self):
        self.client.force_authenticate(user=self.admin_user)
        image = SimpleUploadedFile(
            'product.jpg',
            one_pixel_png(),
            content_type='image/png',
        )

        response = self.client.post(
            reverse('admin-product-image-list'),
            {
                'product_id': self.product.id,
                'image': image,
                'is_primary': 'true',
                'order': '0',
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            ProductImage.objects.filter(product=self.product).exists(),
        )

    def test_admin_cannot_upload_invalid_image(self):
        self.client.force_authenticate(user=self.admin_user)
        image = SimpleUploadedFile(
            'product.txt',
            b'not-an-image',
            content_type='text/plain',
        )

        response = self.client.post(
            reverse('admin-product-image-list'),
            {
                'product_id': self.product.id,
                'image': image,
                'is_primary': 'true',
                'order': '0',
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ProductImage.objects.count(), 0)


class PublicProductApiTests(APITestCase):
    def setUp(self):
        category = Category.objects.create(name='Balo cầu lông')
        brand = Brand.objects.create(name='Victor')
        self.active_product = Product.objects.create(
            category=category,
            brand=brand,
            name='Balo Victor Active',
            description='Balo chính hãng',
            price=Decimal('1599000'),
            compare_at_price=Decimal('1799000'),
            stock_quantity=5,
            is_active=True,
        )
        Product.objects.create(
            category=category,
            brand=brand,
            name='Sản phẩm đã ẩn',
            price=Decimal('100000'),
            stock_quantity=3,
            is_active=False,
        )

    def test_product_list_returns_only_active_products(self):
        response = self.client.get(reverse('product-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Balo Victor Active')
        self.assertEqual(response.data[0]['category']['name'], 'Balo cầu lông')
        self.assertEqual(response.data[0]['brand']['name'], 'Victor')

    def test_product_detail_returns_nested_product_information(self):
        response = self.client.get(
            reverse(
                'product-detail',
                kwargs={'slug': self.active_product.slug},
            ),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Balo Victor Active')
        self.assertEqual(response.data['description'], 'Balo chính hãng')
        self.assertEqual(response.data['category']['slug'], 'balo-cau-long')
        self.assertEqual(response.data['brand']['slug'], 'victor')
        self.assertEqual(response.data['images'], [])

    def test_hidden_product_detail_is_not_publicly_available(self):
        hidden_product = Product.objects.get(name='Sản phẩm đã ẩn')

        response = self.client.get(
            reverse(
                'product-detail',
                kwargs={'slug': hidden_product.slug},
            ),
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
