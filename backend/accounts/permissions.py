from rest_framework.permissions import BasePermission, IsAdminUser

from .models import StaffProfile


ROLE_ACCESS = {
    StaffProfile.Role.OWNER: {'products', 'orders', 'users', 'dashboard'},
    StaffProfile.Role.PRODUCT_MANAGER: {'products', 'dashboard'},
    StaffProfile.Role.ORDER_MANAGER: {'orders', 'dashboard'},
}


class StaffRolePermission(BasePermission):
    """Authorize existing admin endpoints by their mapped functional area."""

    area = None

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated or not request.user.is_staff:
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'staff_profile', None)
        return bool(profile and self.area in ROLE_ACCESS.get(profile.role, set()))


class OwnerPermission(StaffRolePermission):
    area = 'users'


class ProductManagerPermission(StaffRolePermission):
    area = 'products'


class OrderManagerPermission(StaffRolePermission):
    area = 'orders'


class AuditLogPermission(StaffRolePermission):
    area = 'dashboard'


class ReportPermission(StaffRolePermission):
    area = 'dashboard'
