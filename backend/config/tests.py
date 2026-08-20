from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken


User = get_user_model()


class AdminAuthenticationApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='admin',
            password='strong-test-password',
            is_staff=True,
        )
        self.url = reverse('token_obtain_pair')

    def test_valid_credentials_return_access_and_refresh_tokens(self):
        response = self.client.post(
            self.url,
            {
                'username': 'admin',
                'password': 'strong-test-password',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_invalid_credentials_are_rejected(self):
        response = self.client.post(
            self.url,
            {
                'username': 'admin',
                'password': 'wrong-password',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_valid_refresh_token_returns_new_access_token(self):
        refresh_token = str(RefreshToken.for_user(self.user))

        response = self.client.post(
            reverse('token_refresh'),
            {'refresh': refresh_token},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_invalid_refresh_token_is_rejected(self):
        response = self.client.post(
            reverse('token_refresh'),
            {'refresh': 'invalid-refresh-token'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
