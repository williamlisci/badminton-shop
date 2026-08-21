import { apiClient } from './client'

export interface AccountUser { id: number; username: string; email: string; first_name: string }
export interface Address { id: number; label: string; recipient_name: string; phone: string; address: string; is_default: boolean }
export interface WishlistItem { id: number; product: number; product_detail: { id: number; name: string; slug: string; price: string; primary_image: string | null } }

export async function register(data: { username: string; email: string; password: string; first_name: string; phone: string; address: string }) {
    const response = await apiClient.post('/auth/register/', data)
    localStorage.setItem('customer_access', response.data.access)
    localStorage.setItem('customer_refresh', response.data.refresh)
    return response.data.user as AccountUser
}
export async function login(username: string, password: string) {
    const response = await apiClient.post('/auth/customer-login/', { username, password })
    localStorage.setItem('customer_access', response.data.access)
    localStorage.setItem('customer_refresh', response.data.refresh)
}
export async function loginWithGoogle(credential: string) {
    const response = await apiClient.post('/auth/google/', {credential})
    localStorage.setItem('customer_access', response.data.access)
    localStorage.setItem('customer_refresh', response.data.refresh)
    return response.data.user as AccountUser
}
export function logout() { localStorage.removeItem('customer_access'); localStorage.removeItem('customer_refresh') }
export const getMe = async () => (await apiClient.get<AccountUser>('/account/me/')).data
export const getAddresses = async () => (await apiClient.get<Address[]>('/account/addresses/')).data
export const saveAddress = async (data: Omit<Address, 'id'>) => (await apiClient.post('/account/addresses/', data)).data
export const deleteAddress = async (id: number) => apiClient.delete(`/account/addresses/${id}/`)
export const getWishlist = async () => (await apiClient.get<WishlistItem[]>('/account/wishlist/')).data
export const addWishlist = async (product: number) => (await apiClient.post('/account/wishlist/', { product })).data
export const removeWishlist = async (id: number) => apiClient.delete(`/account/wishlist/${id}/`)
export const getOrderHistory = async () => (await apiClient.get('/orders/mine/')).data
