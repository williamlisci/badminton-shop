from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import ShippingAddress, StaffProfile, WishlistItem
from .models import AuditLog
from products.models import Product

User = get_user_model()


class StaffUserSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(
        source='staff_profile.role', choices=StaffProfile.Role.choices, required=False,
    )
    role_display = serializers.CharField(source='staff_profile.get_role_display', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'is_active', 'role', 'role_display', 'date_joined']
        read_only_fields = ['id', 'date_joined', 'role_display']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        profile = StaffProfile.objects.filter(user_id=instance.pk).first()
        data['role'] = profile.role if profile else StaffProfile.Role.OWNER
        return data

    def validate_username(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Tên đăng nhập không được để trống.')
        return value

    def validate(self, attrs):
        password = attrs.pop('password', None)
        if password:
            validate_password(password, self.instance)
            attrs['_password'] = password
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('_password', None)
        profile_data = validated_data.pop('staff_profile', {})
        role = profile_data.get('role', StaffProfile.Role.PRODUCT_MANAGER)
        user = User(is_staff=True, **validated_data)
        user.set_password(password)
        user.save()
        StaffProfile.objects.update_or_create(user=user, defaults={'role': role})
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('_password', None)
        profile_data = validated_data.pop('staff_profile', {})
        role = profile_data.get('role')
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if password:
            instance.set_password(password)
        instance.save()
        if role is not None:
            StaffProfile.objects.update_or_create(user=instance, defaults={'role': role})
        return instance


class StaffUserCreateSerializer(StaffUserSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta(StaffUserSerializer.Meta):
        fields = StaffUserSerializer.Meta.fields + ['password']


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.username', read_only=True, allow_null=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'actor', 'actor_name', 'action', 'action_display',
            'entity_type', 'entity_id', 'summary', 'changes', 'created_at',
        ]
        read_only_fields = fields


class CustomerRegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.RegexField(regex=r'^[0-9+()\-\s]{7,20}$')
    address = serializers.CharField(max_length=500)

    def create(self, validated_data):
        phone = validated_data.pop('phone')
        address = validated_data.pop('address')
        user = User.objects.create_user(**validated_data)
        ShippingAddress.objects.create(
            user=user,
            label='Địa chỉ mặc định',
            recipient_name=user.first_name or user.username,
            phone=phone,
            address=address,
            is_default=True,
        )
        return user


class ShippingAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingAddress
        fields = ['id', 'label', 'recipient_name', 'phone', 'address', 'is_default', 'created_at']
        read_only_fields = ['id', 'created_at']


class WishlistItemSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.filter(is_active=True))
    product_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = WishlistItem
        fields = ['id', 'product', 'product_detail', 'created_at']
        read_only_fields = ['id', 'product_detail', 'created_at']

    def get_product_detail(self, obj):
        from products.serializers import ProductListSerializer
        return ProductListSerializer(obj.product, context=self.context).data
