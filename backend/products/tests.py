from decimal import Decimal
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from openpyxl import Workbook
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Brand, Category, Product, ProductImage
from orders.models import Order, OrderItem


User = get_user_model()


class AdminProductImportExportTests(APITestCase):
    def setUp(self):
        self.category = Category.objects.create(name='Vợt')
        self.brand = Brand.objects.create(name='Victor')
        self.admin = User.objects.create_user(username='import-admin', password='pass', is_staff=True)
        self.user = User.objects.create_user(username='import-user', password='pass')
        self.import_url = reverse('admin-product-import')
        self.export_url = reverse('admin-product-export')

    def test_import_csv_reports_each_row_and_creates_only_valid_rows(self):
        payload = (
            'name,description,price,stock_quantity,is_active,category_id,brand_id\n'
            f'Good,,100000,3,True,{self.category.id},{self.brand.id}\n'
            f'Bad,,not-money,3,True,{self.category.id},{self.brand.id}\n'
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            self.import_url,
            {'file': SimpleUploadedFile('products.csv', payload.encode(), content_type='text/csv')},
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['success_count'], 1)
        self.assertEqual(response.data['error_count'], 1)
        self.assertEqual(response.data['errors'][0]['line'], 3)
        self.assertTrue(Product.objects.filter(name='Good').exists())

    def test_import_xlsx_and_export_require_admin(self):
        workbook = Workbook()
        sheet = workbook.active
        sheet.append(['name', 'price', 'stock_quantity', 'category_id'])
        sheet.append(['XLSX product', 120000, 2, self.category.id])
        file_data = BytesIO()
        workbook.save(file_data)
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.get(self.export_url).status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            self.import_url,
            {'file': SimpleUploadedFile('products.xlsx', file_data.getvalue(),
                                        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')},
            format='multipart',
        )
        self.assertEqual(response.data['success_count'], 1)
        exported = self.client.get(self.export_url)
        self.assertEqual(exported.status_code, status.HTTP_200_OK)
        self.assertIn('XLSX product', exported.content.decode())



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

    def test_admin_can_set_primary_reorder_and_delete_images(self):
        self.client.force_authenticate(user=self.admin_user)
        image_url = reverse('admin-product-image-list')
        image_ids = []
        for name in ('first.png', 'second.png'):
            response = self.client.post(
                image_url,
                {
                    'product_id': self.product.id,
                    'image': SimpleUploadedFile(name, one_pixel_png(), content_type='image/png'),
                    'is_primary': 'false',
                },
                format='multipart',
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            image_ids.append(response.data['id'])
        primary_response = self.client.post(
            reverse('admin-product-image-set-primary', kwargs={'pk': image_ids[1]}),
        )
        self.assertEqual(primary_response.status_code, status.HTTP_200_OK)
        reorder_response = self.client.post(
            reverse('admin-product-image-reorder'),
            {'product_id': self.product.id, 'image_ids': image_ids[::-1]},
            format='json',
        )
        self.assertEqual(reorder_response.status_code, status.HTTP_200_OK)
        delete_response = self.client.delete(
            reverse('admin-product-image-detail', kwargs={'pk': image_ids[1]}),
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        remaining = ProductImage.objects.get(pk=image_ids[0])
        self.assertTrue(remaining.is_primary)


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

    def test_product_list_supports_filters_sorting_and_pagination(self):
        response = self.client.get(
            reverse('product-list'),
            {'search': 'Victor', 'category__slug': 'balo-cau-long', 'brand__slug': 'victor', 'ordering': '-price', 'page': 1, 'page_size': 1},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(len(response.data['results']), 1)

    def test_product_list_can_sort_by_non_cancelled_sold_quantity(self):
        popular = Product.objects.create(
            category=self.active_product.category,
            brand=self.active_product.brand,
            name='Popular product',
            price=Decimal('200000'),
            stock_quantity=5,
            is_active=True,
        )
        cancelled = Order.objects.create(
            customer_name='A', customer_phone='0900000001',
            shipping_address='Hà Nội', status=Order.Status.CANCELLED,
        )
        completed = Order.objects.create(
            customer_name='B', customer_phone='0900000002',
            shipping_address='Hà Nội', status=Order.Status.COMPLETED,
        )
        OrderItem.objects.create(
            order=cancelled, product=self.active_product,
            product_name=self.active_product.name, price=self.active_product.price,
            quantity=20,
        )
        OrderItem.objects.create(
            order=completed, product=popular,
            product_name=popular.name, price=popular.price, quantity=3,
        )

        response = self.client.get(
            reverse('product-list'), {'ordering': '-popularity'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['name'], 'Popular product')

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


class AdminCatalogApiTests(APITestCase):
    def setUp(self):
        self.category = Category.objects.create(
            name='Vợt cầu lông',
            description='Danh mục vợt',
        )
        self.brand = Brand.objects.create(name='Victor')
        self.admin_user = User.objects.create_user(
            username='catalog-admin',
            password='test-password',
            is_staff=True,
        )
        self.regular_user = User.objects.create_user(
            username='catalog-customer',
            password='test-password',
        )

    def test_catalog_requires_admin(self):
        response = self.client.get(reverse('admin-category-list'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(reverse('admin-brand-list'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_update_and_hide_category(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            reverse('admin-category-list'),
            {'name': 'Giày cầu lông', 'description': '', 'is_active': True},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        category = Category.objects.get(name='Giày cầu lông')

        response = self.client.patch(
            reverse('admin-category-detail', kwargs={'pk': category.pk}),
            {'name': 'Áo cầu lông'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        category.refresh_from_db()
        self.assertEqual(category.name, 'Áo cầu lông')

        response = self.client.delete(
            reverse('admin-category-detail', kwargs={'pk': category.pk}),
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        category.refresh_from_db()
        self.assertFalse(category.is_active)

    def test_admin_rejects_duplicate_catalog_slug(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            reverse('admin-brand-list'),
            {'name': 'Victor', 'is_active': True},
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('đã tồn tại', str(response.data))
