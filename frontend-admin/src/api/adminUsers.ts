import {apiClient} from './client'

export type StaffRole = 'owner' | 'product_manager' | 'order_manager'

export interface AdminUser {
    id: number
    username: string
    email: string
    first_name: string
    last_name: string
    is_active: boolean
    role: StaffRole
    role_display: string
    date_joined: string
}

export interface AdminUserPayload {
    username: string
    email: string
    first_name: string
    last_name: string
    role: StaffRole
    password?: string
}

export const getAdminUsers = async (): Promise<AdminUser[]> => {
    const response = await apiClient.get('/admin-users/')
    return response.data.results ?? response.data
}

export const createAdminUser = async (payload: AdminUserPayload) => {
    const response = await apiClient.post('/admin-users/', payload)
    return response.data as AdminUser
}

export const updateAdminUser = async (id: number, payload: Partial<AdminUserPayload>) => {
    const response = await apiClient.patch(`/admin-users/${id}/`, payload)
    return response.data as AdminUser
}

export const setAdminUserActive = async (id: number, active: boolean) => {
    const response = await apiClient.post(`/admin-users/${id}/${active ? 'unlock' : 'lock'}/`)
    return response.data as AdminUser
}
