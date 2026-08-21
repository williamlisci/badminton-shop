from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Category, Product
from orders.models import Order
from .models import AuditLog, StaffProfile

User = get_user_model()


class StaffManagementApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner', password='strong-password', is_staff=True,
        )
        self.owner.staff_profile.role = StaffProfile.Role.OWNER
        self.owner.staff_profile.save()
        self.client.force_authenticate(self.owner)
        self.url = reverse('admin-user-list')

    def test_owner_can_create_list_and_update_staff(self):
        response = self.client.post(self.url, {
            'username': 'products', 'password': 'another-strong-password',
            'email': 'products@example.com', 'role': StaffProfile.Role.PRODUCT_MANAGER,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['role'], StaffProfile.Role.PRODUCT_MANAGER)
        user_url = reverse('admin-user-detail', args=[response.data['id']])
        response = self.client.patch(user_url, {'role': StaffProfile.Role.ORDER_MANAGER}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], StaffProfile.Role.ORDER_MANAGER)

    def test_owner_can_lock_and_unlock_staff(self):
        user = User.objects.create_user(
            username='staff', password='strong-password', is_staff=True,
        )
        user.staff_profile.role = StaffProfile.Role.PRODUCT_MANAGER
        user.staff_profile.save()
        detail = reverse('admin-user-detail', args=[user.pk])
        self.assertEqual(self.client.post(f'{detail}lock/').status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertFalse(user.is_active)
        self.assertEqual(self.client.post(f'{detail}unlock/').status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.is_active)

    def test_last_owner_cannot_be_locked_or_demoted(self):
        detail = reverse('admin-user-detail', args=[self.owner.pk])
        self.assertEqual(self.client.post(f'{detail}lock/').status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.patch(detail, {'role': StaffProfile.Role.ORDER_MANAGER}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_owner_cannot_manage_staff(self):
        staff = User.objects.create_user(
            username='products', password='strong-password', is_staff=True,
        )
        staff.staff_profile.role = StaffProfile.Role.PRODUCT_MANAGER
        staff.staff_profile.save()
        self.client.force_authenticate(staff)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_403_FORBIDDEN)

    def test_product_and_order_roles_are_scoped(self):
        product_manager = User.objects.create_user(
            username='catalog', password='strong-password', is_staff=True,
        )
        product_manager.staff_profile.role = StaffProfile.Role.PRODUCT_MANAGER
        product_manager.staff_profile.save()
        self.client.force_authenticate(product_manager)
        self.assertEqual(
            self.client.get(reverse('admin-product-list')).status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(self.client.get(reverse('admin-order-list')).status_code, status.HTTP_403_FORBIDDEN)

        order_manager = User.objects.create_user(
            username='orders', password='strong-password', is_staff=True,
        )
        order_manager.staff_profile.role = StaffProfile.Role.ORDER_MANAGER
        order_manager.staff_profile.save()
        self.client.force_authenticate(order_manager)
        self.assertEqual(self.client.get(reverse('admin-order-list')).status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.client.get(reverse('admin-product-list')).status_code,
            status.HTTP_403_FORBIDDEN,
        )


class AuditLogApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='audit-owner', password='strong-password', is_staff=True,
        )
        self.owner.staff_profile.role = StaffProfile.Role.OWNER
        self.owner.staff_profile.save()
        self.client.force_authenticate(self.owner)
        self.category = Category.objects.create(name='Audit category')
        self.product = Product.objects.create(
            category=self.category, name='Audit racket', price=100000,
        )

    def test_product_and_stock_changes_are_recorded(self):
        product_url = reverse('admin-product-detail', args=[self.product.pk])
        response = self.client.patch(product_url, {'name': 'Updated racket'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        stock_response = self.client.post(
            reverse('admin-stock-transaction-list'),
            {
                'product': self.product.pk,
                'transaction_type': 'in',
                'quantity': 3,
                'reason': 'Nhập hàng',
            },
            format='json',
        )
        self.assertEqual(stock_response.status_code, status.HTTP_201_CREATED)
        logs = AuditLog.objects.filter(entity_type='product')
        self.assertTrue(logs.filter(action=AuditLog.Action.UPDATED).exists())
        self.assertTrue(logs.filter(action=AuditLog.Action.STOCK_CHANGED).exists())

    def test_order_update_and_audit_endpoint_are_recorded(self):
        order = Order.objects.create(
            customer_name='Audit customer',
            customer_phone='0900000001',
            shipping_address='Audit address',
        )
        response = self.client.patch(
            reverse('admin-order-detail', args=[order.pk]),
            {'internal_note': 'Call before delivery'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(AuditLog.objects.filter(entity_type='order', entity_id=str(order.pk)).exists())
        audit_response = self.client.get(
            reverse('admin-audit-log-list'),
            {'entity_type': 'order'},
        )
        self.assertEqual(audit_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(audit_response.data), 1)
