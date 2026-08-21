from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Category, Product
from .models import Customer, DiscountCode, Order, OrderItem


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

    def test_online_transfer_payment_and_public_tracking(self):
        response = self.client.post(
            self.url,
            self.order_payload(payment_method='bank_transfer'),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['payment_method'], 'bank_transfer')
        tracking = self.client.get(
            reverse('order-track'),
            {'order_id': response.data['id'], 'phone': '0901234567'},
        )
        self.assertEqual(tracking.status_code, status.HTTP_200_OK)
        self.assertEqual(tracking.data['status'], 'pending')

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

    def test_validate_discount_returns_discounted_total_without_consuming_coupon(self):
        discount = DiscountCode.objects.create(
            code='SAVE10',
            discount_type=DiscountCode.DiscountType.PERCENTAGE,
            value=Decimal('10'),
            starts_at=timezone.now() - timedelta(days=1),
            ends_at=timezone.now() + timedelta(days=1),
        )
        response = self.client.post(
            reverse('discount-validate'),
            {
                'discount_code': 'save10',
                'items': [{'product_id': self.product.id, 'quantity': 2}],
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['discount_amount'], Decimal('319800'))
        self.assertEqual(response.data['discounted_total'], Decimal('2878200'))
        discount.refresh_from_db()
        self.assertEqual(discount.used_count, 0)


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
        self.assertEqual(self.order.status_history.count(), 1)
        self.assertEqual(
            self.order.status_history.first().to_status,
            Order.Status.CONFIRMED,
        )

    def test_admin_order_search_and_status_date_filters(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(
            self.list_url,
            {
                'search': '0901234567',
                'status': Order.Status.PENDING,
                'start_date': self.order.created_at.date().isoformat(),
                'end_date': self.order.created_at.date().isoformat(),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.order.id)

    def test_admin_can_add_internal_note_and_cancel_with_reason(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.patch(
            reverse('admin-order-detail', kwargs={'pk': self.order.id}),
            {'internal_note': 'Gọi lại cho khách trước khi giao.'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['internal_note'], 'Gọi lại cho khách trước khi giao.')

        response = self.client.post(
            reverse('admin-order-cancel', kwargs={'pk': self.order.id}),
            {'reason': 'Khách yêu cầu hủy.'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.CANCELLED)
        self.assertEqual(self.order.cancellation_reason, 'Khách yêu cầu hủy.')
        self.assertEqual(self.order.status_history.first().reason, 'Khách yêu cầu hủy.')

    def test_cancel_requires_reason(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            reverse('admin-order-cancel', kwargs={'pk': self.order.id}),
            {},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

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

    def test_admin_can_export_orders_and_revenue_but_regular_user_cannot(self):
        orders_url = reverse('admin-order-export')
        revenue_url = reverse('admin-order-revenue-export')
        self.client.force_authenticate(user=self.regular_user)
        self.assertEqual(self.client.get(orders_url).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get(revenue_url).status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.admin_user)
        orders_response = self.client.get(orders_url)
        self.assertEqual(orders_response.status_code, status.HTTP_200_OK)
        self.assertIn('Victor Thruster', orders_response.content.decode())

        revenue_response = self.client.get(revenue_url)
        self.assertEqual(revenue_response.status_code, status.HTTP_200_OK)
        self.assertIn('5000000', revenue_response.content.decode())

    def test_revenue_export_excludes_cancelled_orders(self):
        Order.objects.create(
            customer_name='Cancelled',
            customer_phone='0900000000',
            shipping_address='Hà Nội',
            status=Order.Status.CANCELLED,
            total_amount=Decimal('9000000'),
        )
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(reverse('admin-order-revenue-export'))
        content = response.content.decode()
        self.assertIn('5000000', content)
        self.assertNotIn('9000000', content)


class DiscountCodeApiTests(APITestCase):
    def setUp(self):
        self.category = Category.objects.create(name='Vợt')
        self.product = Product.objects.create(
            category=self.category, name='Vợt test', price=Decimal('100000'),
            stock_quantity=10, is_active=True,
        )
        self.admin = User.objects.create_user(
            username='discount-admin', password='password', is_staff=True,
        )
        self.user = User.objects.create_user(
            username='discount-user', password='password',
        )
        self.url = reverse('admin-discount-list')
        now = timezone.now()
        self.discount = DiscountCode.objects.create(
            code='SAVE10', discount_type=DiscountCode.DiscountType.PERCENTAGE,
            value=10, starts_at=now - timedelta(days=1),
            ends_at=now + timedelta(days=1), max_uses=1,
        )

    def test_admin_crud_and_regular_user_forbidden(self):
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response = self.client.patch(
            reverse('admin-discount-detail', kwargs={'pk': self.discount.pk}),
            {'value': 20}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['value'], '20')

    def test_create_preserves_active_state_and_usage_limit(self):
        self.client.force_authenticate(user=self.admin)
        now = timezone.now()
        response = self.client.post(self.url, {
            'code': 'ACTIVE20',
            'discount_type': 'percentage',
            'value': 20,
            'starts_at': (now - timedelta(minutes=1)).isoformat(),
            'ends_at': (now + timedelta(days=7)).isoformat(),
            'max_uses': 25,
            'min_order_amount': 0,
            'is_active': True,
            'product_ids': [],
            'category_ids': [],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIs(response.data['is_active'], True)
        self.assertEqual(response.data['max_uses'], 25)
        self.assertEqual(response.data['used_count'], 0)

        saved = self.client.get(
            reverse('admin-discount-detail', kwargs={'pk': response.data['id']}),
        )
        self.assertEqual(saved.data['is_active'], True)
        self.assertEqual(saved.data['max_uses'], 25)
        self.assertEqual(saved.data['used_count'], 0)

    def test_validation_rejects_invalid_percentage_and_dates(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(self.url, {
            'code': 'BAD', 'discount_type': 'percentage', 'value': 101,
            'starts_at': '2026-08-22T00:00:00Z', 'ends_at': '2026-08-21T00:00:00Z',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


        self.assertIn('value', response.data)
        response = self.client.post(self.url, {
            'code': 'BAD-DATES', 'discount_type': 'percentage', 'value': 10,
            'starts_at': '2026-08-22T00:00:00Z', 'ends_at': '2026-08-21T00:00:00Z',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ends_at', response.data)

    def test_discount_applies_and_usage_limit_is_enforced(self):
        response = self.client.post(reverse('order-create'), {
            'customer_name': 'Khách', 'customer_phone': '0901234567',
            'shipping_address': 'Hà Nội',
            'items': [{'product_id': self.product.pk, 'quantity': 2}],
            'discount_code': 'save10',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['discount_amount'], '20000')
        self.assertEqual(response.data['total_amount'], '180000')
        response = self.client.post(reverse('order-create'), {
            'customer_name': 'Khách 2', 'customer_phone': '0901234568',
            'shipping_address': 'Hà Nội',
            'items': [{'product_id': self.product.pk, 'quantity': 1}],
            'discount_code': 'SAVE10',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
class AdminCustomerApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='customers-admin', password='password', is_staff=True,
        )
        self.user = User.objects.create_user(
            username='customers-user', password='password',
        )
        Order.objects.create(
            customer_name='Trần Thị B', customer_phone='0912345678',
            shipping_address='Hồ Chí Minh', total_amount=Decimal('1200000'),
        )
        Order.objects.create(
            customer_name='Trần Thị B', customer_phone='0912345678',
            shipping_address='Hồ Chí Minh', total_amount=Decimal('800000'),
        )
        self.list_url = reverse('admin-customer-list')

    def test_customer_api_requires_admin(self):
        self.assertEqual(self.client.get(self.list_url).status_code, 401)
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.get(self.list_url).status_code, 403)

    def test_customer_stats_search_and_order_history(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.list_url, {'search': '0912345678'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['purchase_count'], 2)
        self.assertEqual(response.data[0]['total_spent'], '2000000')
        self.assertEqual(len(response.data[0]['orders']), 2)
        self.assertEqual(
            self.client.get(self.list_url, {'search': 'Không tồn tại'}).data, [],
        )

    def test_admin_can_update_customer_note(self):
        self.client.force_authenticate(user=self.admin)
        customer = Customer.objects.get(customer_phone='0912345678')
        response = self.client.patch(
            reverse('admin-customer-detail', kwargs={'pk': customer.pk}),
            {'note': 'Khách thân thiết.'}, format='json',
        )
        self.assertEqual(response.status_code, 200)
        customer.refresh_from_db()
        self.assertEqual(customer.note, 'Khách thân thiết.')


class ReportsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='report-owner', password='strong-password', is_staff=True,
        )
        self.admin.staff_profile.role = 'owner'
        self.admin.staff_profile.save()
        self.client.force_authenticate(self.admin)
        category = Category.objects.create(name='Report category')
        product = Product.objects.create(
            category=category,
            name='Report racket',
            price=Decimal('100000'),
            cost_price=Decimal('60000'),
            stock_quantity=10,
        )
        order = Order.objects.create(
            customer_name='Report customer',
            customer_phone='0987654321',
            shipping_address='Report address',
            status=Order.Status.COMPLETED,
            total_amount=Decimal('200000'),
        )
        OrderItem.objects.create(
            order=order,
            product=product,
            product_name=product.name,
            price=Decimal('100000'),
            cost_price=Decimal('60000'),
            quantity=2,
        )
        self.url = reverse('reports')

    def test_reports_include_profit_best_sellers_and_inventory(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(response.data['summary']['revenue']), '200000')
        self.assertEqual(str(response.data['summary']['cost']), '120000')
        self.assertEqual(str(response.data['summary']['profit']), '80000')
        self.assertEqual(response.data['best_sellers'][0]['quantity_sold'], 2)
        self.assertEqual(response.data['inventory'][0]['stock_quantity'], 10)

    def test_reports_export_excel_and_pdf(self):
        excel = self.client.get(self.url, {'export': 'xlsx'})
        pdf = self.client.get(self.url, {'export': 'pdf'})
        self.assertEqual(excel.status_code, status.HTTP_200_OK)
        self.assertEqual(excel['Content-Type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        self.assertEqual(pdf.status_code, status.HTTP_200_OK)
        self.assertEqual(pdf['Content-Type'], 'application/pdf')
