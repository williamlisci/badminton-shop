from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Category, Product
from .models import Order, OrderItem


User = get_user_model()


class OrderCreateTests(APITestCase):
    def setUp(self):
        self.category = Category.objects.create(name='Balo cầu lông')
        self.product = Product.objects.create(
            category=self.category,
            name='Balo Victor BR5051CNY',
            price=Decimal('1599000'),
            stock_quantity=5,
            is_active=True,
        )
        self.url = reverse('order-create')

    def order_payload(self, **overrides):
        payload = {
            'customer_name': 'Nguyễn Văn A',
            'customer_phone': '0901234567',
            'shipping_address': 'Hà Nội',
            'items': [
                {
                    'product_id': self.product.id,
                    'quantity': 2,
                },
            ],
        }
        payload.update(overrides)
        return payload

    def test_create_order_and_decrease_stock(self):
        response = self.client.post(
            self.url,
            self.order_payload(),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['customer_name'], 'Nguyễn Văn A')
        self.assertEqual(response.data['total_amount'], '3198000')

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 3)

    def test_reject_quantity_above_stock(self):
        response = self.client.post(
            self.url,
            self.order_payload(
                items=[
                    {
                        'product_id': self.product.id,
                        'quantity': 6,
                    },
                ],
            ),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Sản phẩm', str(response.data))

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 5)

    def test_reject_inactive_product(self):
        self.product.is_active = False
        self.product.save(update_fields=['is_active'])

        response = self.client.post(
            self.url,
            self.order_payload(),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('không tồn tại', str(response.data))

    def test_reject_duplicate_product_lines(self):
        response = self.client.post(
            self.url,
            self.order_payload(
                items=[
                    {'product_id': self.product.id, 'quantity': 1},
                    {'product_id': self.product.id, 'quantity': 1},
                ],
            ),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('không được xuất hiện nhiều lần', str(response.data))

    def test_reject_invalid_customer_phone(self):
        response = self.client.post(
            self.url,
            self.order_payload(customer_phone='not-a-phone'),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Số điện thoại không hợp lệ', str(response.data))


class AdminOrderApiTests(APITestCase):
    def setUp(self):
        category = Category.objects.create(name='Vợt cầu lông')
        self.product = Product.objects.create(
            category=category,
            name='Victor Thruster',
            price=Decimal('2500000'),
            stock_quantity=10,
            is_active=True,
        )
        self.order = Order.objects.create(
            customer_name='Nguyễn Văn A',
            customer_phone='0901234567',
            shipping_address='Hà Nội',
            total_amount=Decimal('5000000'),
        )
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            product_name=self.product.name,
            price=self.product.price,
            quantity=2,
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
        self.list_url = reverse('admin-order-list')
        self.dashboard_url = reverse('dashboard-stats')

    def test_anonymous_user_cannot_access_admin_orders(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_regular_user_cannot_access_dashboard(self):
        self.client.force_authenticate(user=self.regular_user)

        response = self.client.get(self.dashboard_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_view_order_with_items(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(
            reverse(
                'admin-order-detail',
                kwargs={'pk': self.order.id},
            ),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['customer_name'], 'Nguyễn Văn A')
        self.assertEqual(len(response.data['items']), 1)
        self.assertEqual(response.data['items'][0]['quantity'], 2)

    def test_admin_can_update_order_status(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.patch(
            reverse(
                'admin-order-detail',
                kwargs={'pk': self.order.id},
            ),
            {'status': Order.Status.CONFIRMED},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.CONFIRMED)

    def test_regular_user_cannot_update_order_status(self):
        self.client.force_authenticate(user=self.regular_user)

        response = self.client.patch(
            reverse(
                'admin-order-detail',
                kwargs={'pk': self.order.id},
            ),
            {'status': Order.Status.CONFIRMED},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.PENDING)

    def test_admin_can_view_dashboard_stats(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(self.dashboard_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_products'], 1)
        self.assertEqual(response.data['total_orders'], 1)
        self.assertEqual(response.data['total_revenue'], Decimal('5000000'))
        self.assertEqual(response.data['period'], 'day')
        self.assertEqual(response.data['period_orders'], 1)
        self.assertEqual(response.data['period_revenue'], Decimal('5000000'))
        self.assertEqual(response.data['average_order_value'], Decimal('5000000'))
        self.assertEqual(len(response.data['revenue_trend']), 30)
        self.assertEqual(response.data['top_products'][0]['quantity_sold'], 2)
        self.assertEqual(len(response.data['orders_by_status']), 5)

    def test_admin_can_view_monthly_dashboard_stats(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(
            self.dashboard_url,
            {'period': 'month'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['period'], 'month')
        self.assertEqual(len(response.data['revenue_trend']), 12)

    def test_cancelled_orders_are_excluded_from_dashboard(self):
        Order.objects.create(
            customer_name='Nguyễn Văn B',
            customer_phone='0907654321',
            shipping_address='Đà Nẵng',
            status=Order.Status.CANCELLED,
            total_amount=Decimal('9000000'),
        )
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(self.dashboard_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_orders'], 1)
        self.assertEqual(response.data['total_revenue'], Decimal('5000000'))
