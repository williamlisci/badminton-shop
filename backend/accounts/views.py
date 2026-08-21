import json
from urllib.parse import urlencode
from urllib.request import urlopen
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import status, viewsets, generics
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import AuditLog, ShippingAddress, StaffProfile, WishlistItem
from .permissions import AuditLogPermission, OwnerPermission
from .serializers import (
    AuditLogSerializer, CustomerRegisterSerializer, ShippingAddressSerializer,
    StaffUserCreateSerializer, StaffUserSerializer, WishlistItemSerializer,
)
from orders.serializers import OrderSerializer

User = get_user_model()


class AdminStaffUserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.filter(is_staff=True).select_related('staff_profile').order_by('id')
    permission_classes = [OwnerPermission]
    http_method_names = ['get', 'post', 'patch', 'put', 'head', 'options']

    def get_serializer_class(self):
        return StaffUserCreateSerializer if self.action == 'create' else StaffUserSerializer

    def _last_active_owner(self, user, role=None, active=None):
        current_role = role or getattr(getattr(user, 'staff_profile', None), 'role', None)
        resulting_active = user.is_active if active is None else active
        if current_role == StaffProfile.Role.OWNER and user.is_active and not resulting_active:
            return User.objects.filter(
                is_staff=True, is_active=True,
                staff_profile__role=StaffProfile.Role.OWNER,
            ).exclude(pk=user.pk).exists() is False
        return False

    def perform_update(self, serializer):
        user = self.get_object()
        role = serializer.validated_data.get('staff_profile', {}).get('role')
        active = serializer.validated_data.get('is_active')
        is_demoting_last_owner = (
            role is not None and role != StaffProfile.Role.OWNER
            and getattr(getattr(user, 'staff_profile', None), 'role', None) == StaffProfile.Role.OWNER
            and not User.objects.filter(
                is_staff=True, is_active=True,
                staff_profile__role=StaffProfile.Role.OWNER,
            ).exclude(pk=user.pk).exists()
        )
        if self._last_active_owner(user, role, active) or is_demoting_last_owner:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': 'Không thể loại bỏ chủ shop cuối cùng.'})
        serializer.save()

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def lock(self, request, pk=None):
        user = self.get_object()
        if user.pk == request.user.pk:
            return Response({'detail': 'Không thể tự khóa tài khoản.'}, status=400)
        if self._last_active_owner(user, active=False):
            return Response({'detail': 'Không thể khóa chủ shop cuối cùng.'}, status=400)
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response(self.get_serializer(user).data)

    @action(detail=True, methods=['post'])
    def unlock(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=['is_active'])
        return Response(self.get_serializer(user).data)


class AdminAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('actor').all()
    serializer_class = AuditLogSerializer
    permission_classes = [AuditLogPermission]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['summary', 'entity_id', 'actor__username']
    filterset_fields = ['action', 'entity_type', 'actor']


class CustomerRegisterView(generics.CreateAPIView):
    serializer_class = CustomerRegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': {'id': user.id, 'username': user.username, 'email': user.email, 'first_name': user.first_name},
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)


class CustomerGoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        credential = str(request.data.get('credential', '')).strip()
        if not credential or not settings.GOOGLE_CLIENT_ID:
            return Response({'detail': 'Google OAuth chưa được cấu hình.'}, status=503)
        try:
            query = urlencode({'id_token': credential})
            with urlopen(f'https://oauth2.googleapis.com/tokeninfo?{query}', timeout=5) as response:
                claims = json.load(response)
        except Exception:
            return Response({'detail': 'Token Google không hợp lệ.'}, status=400)
        if claims.get('aud') != settings.GOOGLE_CLIENT_ID or claims.get('email_verified') != 'true':
            return Response({'detail': 'Không thể xác thực tài khoản Google.'}, status=400)
        email = str(claims.get('email', '')).lower().strip()
        if not email:
            return Response({'detail': 'Google không cung cấp email.'}, status=400)
        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            base_username = ''.join(char for char in email.split('@')[0].lower() if char.isalnum()) or 'customer'
            username = base_username
            suffix = 1
            while User.objects.filter(username=username).exists():
                suffix += 1
                username = f'{base_username}{suffix}'
            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=str(claims.get('given_name', ''))[:150],
            )
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': {'id': user.id, 'username': user.username, 'email': user.email, 'first_name': user.first_name},
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })


class CustomerMeView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'id': request.user.id, 'username': request.user.username,
            'email': request.user.email, 'first_name': request.user.first_name,
        })


class ShippingAddressViewSet(viewsets.ModelViewSet):
    serializer_class = ShippingAddressSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        return ShippingAddress.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        if serializer.validated_data.get('is_default'):
            ShippingAddress.objects.filter(user=self.request.user).update(is_default=False)
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.validated_data.get('is_default'):
            ShippingAddress.objects.filter(user=self.request.user).exclude(pk=self.get_object().pk).update(is_default=False)
        serializer.save()


class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistItemSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        return WishlistItem.objects.filter(user=self.request.user).select_related('product')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
